import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeSocialAccounts } from "@/lib/social-accounts"
import type { Profile, SocialAccount, SocialAccountsMap } from "@/types"

type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>

const GRAPH = "https://graph.facebook.com/v19.0"

type FbPage = {
  id: string
  name?: string
  access_token: string
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const oauthError = searchParams.get("error")
  const oauthErrorDesc = searchParams.get("error_description")

  // Canonical base URL — used for both the OAuth redirect_uri (must match what
  // we sent to Meta) AND every user-facing redirect, so the user always lands
  // back on the canonical domain instead of a preview URL.
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : origin)

  console.log("[instagram/callback] entered", {
    hasCode: Boolean(code),
    oauthError,
    origin,
    baseUrl,
    hasSiteEnv: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    hasVercelEnv: Boolean(process.env.VERCEL_URL),
  })

  if (oauthError || !code) {
    console.error("[instagram/callback] oauth dialog returned error", {
      error: oauthError,
      description: oauthErrorDesc,
      fullQuery: Object.fromEntries(searchParams.entries()),
    })
    return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram&reason=oauth_dialog`)
  }

  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (!appId || !appSecret) {
    console.error("[instagram/callback] missing env vars", {
      hasAppId: Boolean(appId),
      hasAppSecret: Boolean(appSecret),
      envKeys: Object.keys(process.env).filter((k) => k.includes("INSTAGRAM")),
    })
    return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram_not_configured`)
  }

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`

  try {
    // 1. Exchange auth code for a short-lived user access token
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
      { method: "GET" },
    )
    const shortData = await shortRes.json()
    if (!shortData.access_token) {
      console.error("[instagram/callback] no short token", {
        status: shortRes.status,
        body: shortData,
        redirectUriSent: redirectUri,
      })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram&reason=short_token`)
    }

    // 2. Exchange short-lived token for a long-lived user token (~60 days)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortData.access_token,
        }).toString(),
      { method: "GET" },
    )
    const longData = await longRes.json()
    if (!longData.access_token) {
      console.error("[instagram/callback] no long token", {
        status: longRes.status,
        body: longData,
      })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram&reason=long_token`)
    }
    const userAccessToken: string = longData.access_token

    // 3. List the user's Facebook Pages — we need the page access token to
    //    reach the connected IG Business Account.
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?` +
        new URLSearchParams({ access_token: userAccessToken }).toString(),
    )
    const pagesData = await pagesRes.json()
    if (pagesData?.error) {
      console.error("[instagram/callback] /me/accounts error", {
        status: pagesRes.status,
        body: pagesData,
      })
    }
    const pages: FbPage[] = pagesData?.data ?? []

    if (pages.length === 0) {
      console.error("[instagram/callback] no FB pages on this account", {
        status: pagesRes.status,
        body: pagesData,
      })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram_no_pages`)
    }

    // 4. Walk pages until we find one connected to an Instagram Business Account.
    let chosenPageId: string | null = null
    let chosenPageToken: string | null = null
    let igUserId: string | null = null

    for (const page of pages) {
      const igRes = await fetch(
        `${GRAPH}/${page.id}?` +
          new URLSearchParams({
            fields: "instagram_business_account",
            access_token: page.access_token,
          }).toString(),
      )
      const igData = await igRes.json()
      if (igData?.error) {
        console.error("[instagram/callback] page lookup error", {
          pageId: page.id,
          body: igData,
        })
      }
      const id: string | undefined = igData?.instagram_business_account?.id
      if (id) {
        chosenPageId = page.id
        chosenPageToken = page.access_token
        igUserId = id
        break
      }
    }

    if (!igUserId || !chosenPageId || !chosenPageToken) {
      console.error("[instagram/callback] no IG business account on any page", {
        pageIds: pages.map((p) => p.id),
      })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram_no_ig`)
    }

    // 5. Look up the IG handle so we can show it in the profile band.
    let igUsername: string | null = null
    try {
      const profRes = await fetch(
        `${GRAPH}/${igUserId}?` +
          new URLSearchParams({
            fields: "username",
            access_token: chosenPageToken,
          }).toString(),
      )
      const profData = await profRes.json()
      if (typeof profData?.username === "string") igUsername = profData.username
    } catch {
      // Non-fatal — we just won't seed the handle.
    }

    // 6. Persist on the current user's profile.
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("[instagram/callback] no authenticated user — redirecting to /login")
      return NextResponse.redirect(`${baseUrl}/login?error=instagram_no_session`)
    }

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    // We store the *page* access token — it's what the IG Graph endpoints need.
    const updates: ProfileUpdate = {
      instagram_access_token: chosenPageToken,
      instagram_token_expires_at: expiresAt,
      instagram_user_id: igUserId,
      instagram_page_id: chosenPageId,
    }

    // Also overlay the IG handle onto social_accounts so the dashboard
    // profile band shows it right away.
    if (igUsername) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("social_accounts")
        .eq("id", user.id)
        .single()
      const existing = normalizeSocialAccounts(
        (profileRow?.social_accounts ?? {}) as SocialAccountsMap | null,
      )
      const prior = existing.instagram
      const merged: Record<string, SocialAccount> = {
        ...existing,
        instagram: {
          platform: "instagram",
          handle: igUsername,
          followers: prior?.followers ?? 0,
          engagement: prior?.engagement ?? 0,
          url: prior?.url,
        },
      }
      updates.social_accounts = merged
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)

    if (updateErr) {
      console.error("[instagram/callback] profile update failed", updateErr)
      return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram&reason=profile_update`)
    }

    const successUrl = `${baseUrl}/dashboard?connected=instagram`
    console.log("[instagram/callback] success — redirecting", {
      successUrl,
      igUserId,
      hasUsername: Boolean(igUsername),
    })
    return NextResponse.redirect(successUrl)
  } catch (err) {
    console.error("[instagram/callback] unexpected error", err)
    return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram&reason=exception`)
  }
}
