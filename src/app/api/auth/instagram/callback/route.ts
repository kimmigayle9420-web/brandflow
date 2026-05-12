import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeSocialAccounts } from "@/lib/social-accounts"
import type { SocialAccount, SocialAccountsMap } from "@/types"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard?error=instagram_auth_failed`)
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/dashboard?error=instagram_not_configured`)
  }

  const redirectUri = `${origin}/api/auth/instagram/callback`

  try {
    // Exchange code for short-lived access token
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error("[instagram/callback] No access_token:", tokenData)
      throw new Error("No access token returned")
    }

    // Fetch username from the Basic Display API
    const userRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
    )
    const userData = await userRes.json()
    const username: string = userData.username ?? `user_${tokenData.user_id ?? userData.id}`

    // Save to Supabase profiles.social_accounts
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/login`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileRow, error: fetchError } = (await supabase
      .from("profiles")
      .select("social_accounts")
      .eq("id", user.id)
      .single()) as any

    if (fetchError) throw new Error(fetchError.message)

    const existing = normalizeSocialAccounts(
      (profileRow?.social_accounts ?? {}) as SocialAccountsMap | null,
    )
    const prior = existing.instagram
    const updated: Record<string, SocialAccount> = {
      ...existing,
      instagram: {
        platform: "instagram",
        handle: username,
        followers: prior?.followers ?? 0,
        engagement: prior?.engagement ?? 0,
        url: prior?.url,
      },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = (await (supabase as any)
      .from("profiles")
      .update({ social_accounts: updated })
      .eq("id", user.id))

    if (updateError) throw new Error(updateError.message)

    return NextResponse.redirect(`${origin}/dashboard?connected=instagram`)
  } catch (err) {
    console.error("[instagram/callback] Error:", err)
    return NextResponse.redirect(`${origin}/dashboard?error=instagram_auth_failed`)
  }
}
