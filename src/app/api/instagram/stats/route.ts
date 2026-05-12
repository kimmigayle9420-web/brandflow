import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// v21.0 introduced `views` as the replacement for the deprecated `impressions`
// metric (account + media). Older versions return errors when `impressions` is
// requested after April 2025.
const GRAPH = "https://graph.facebook.com/v21.0"

type RecentPost = {
  id: string
  caption: string | null
  media_type: string | null
  timestamp: string | null
  like_count: number
  comments_count: number
  reach: number
  views: number
}

type InsightsResponse = {
  data?: Array<{ name: string; values?: Array<{ value: number }> }>
  error?: { message?: string; code?: number }
}

function sumInsight(data: unknown, metric: string): number {
  const arr = (data as InsightsResponse)?.data
  if (!Array.isArray(arr)) return 0
  const row = arr.find((r) => r?.name === metric)
  if (!row?.values) return 0
  return row.values.reduce((acc, v) => acc + (Number.isFinite(v?.value) ? Number(v.value) : 0), 0)
}

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn("[instagram/stats] no authenticated user")
    return NextResponse.json({ connected: false, error: "not_authenticated" }, { status: 401 })
  }
  console.log("[instagram/stats] user resolved", { userId: user.id })

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_token_expires_at")
    .eq("id", user.id)
    .single()

  if (profileErr || !profile?.instagram_access_token || !profile?.instagram_user_id) {
    console.warn("[instagram/stats] no token on profile", {
      userId: user.id,
      profileErr: profileErr?.message,
      hasToken: Boolean(profile?.instagram_access_token),
      hasIgId: Boolean(profile?.instagram_user_id),
    })
    return NextResponse.json({ connected: false, reason: "no_token" })
  }

  console.log("[instagram/stats] token found, fetching Graph API", {
    userId: user.id,
    igId: profile.instagram_user_id,
    tokenTail: profile.instagram_access_token.slice(-8),
  })

  const token = profile.instagram_access_token
  const igId = profile.instagram_user_id
  const expiresAt = profile.instagram_token_expires_at

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ connected: false, expired: true })
  }

  try {
    // 1. Account-level facts. profile_picture_url is best-effort — not all
    //    accounts expose it via Graph.
    const accountRes = await fetch(
      `${GRAPH}/${igId}?` +
        new URLSearchParams({
          fields: "followers_count,media_count,username,profile_picture_url",
          access_token: token,
        }).toString(),
      { cache: "no-store" },
    )
    const account = await accountRes.json()
    if (account?.error) {
      console.error("[instagram/stats] account error", {
        status: accountRes.status,
        igId,
        error: account.error,
      })
      return NextResponse.json({
        connected: false,
        error: "graph_error",
        graphError: account.error,
      })
    }

    // 2. 30-day insights — reach, views, profile_views. Run in parallel with
    //    the media call. Insights can fail independently (e.g. metric not
    //    supported for this account tier) without breaking the rest.
    const until = Math.floor(Date.now() / 1000)
    const since = until - 30 * 24 * 60 * 60

    const [insightsRes, mediaRes] = await Promise.all([
      fetch(
        `${GRAPH}/${igId}/insights?` +
          new URLSearchParams({
            metric: "reach,views,profile_views",
            period: "day",
            since: String(since),
            until: String(until),
            access_token: token,
          }).toString(),
        { cache: "no-store" },
      ),
      fetch(
        `${GRAPH}/${igId}/media?` +
          new URLSearchParams({
            // Keep fields basic — insights.metric(reach) requires
            // instagram_manage_insights which may not be granted. Per-post
            // reach is nice-to-have; we get real likes/comments either way.
            fields: "id,caption,media_type,timestamp,like_count,comments_count",
            limit: "10",
            access_token: token,
          }).toString(),
        { cache: "no-store" },
      ),
    ])

    const insights: InsightsResponse = await insightsRes.json()
    if (insights?.error) {
      console.warn("[instagram/stats] insights unavailable", insights.error)
    }
    const reach = sumInsight(insights, "reach")
    const views = sumInsight(insights, "views")
    const profileViews = sumInsight(insights, "profile_views")

    const media = await mediaRes.json()
    if (media?.error) {
      console.warn("[instagram/stats] media error", media.error)
    }
    const recentPosts: RecentPost[] = Array.isArray(media?.data)
      ? media.data.map((m: Record<string, unknown>) => ({
          id: String(m.id ?? ""),
          caption: (m.caption as string | null) ?? null,
          media_type: (m.media_type as string | null) ?? null,
          timestamp: (m.timestamp as string | null) ?? null,
          like_count: Number(m.like_count ?? 0),
          comments_count: Number(m.comments_count ?? 0),
          reach: 0,
          views: 0,
        }))
      : []

    return NextResponse.json({
      connected: true,
      username: account.username ?? null,
      profilePictureUrl: account.profile_picture_url ?? null,
      followers: Number(account.followers_count ?? 0),
      mediaCount: Number(account.media_count ?? 0),
      reach,
      views,
      profileViews,
      recentPosts,
    })
  } catch (err) {
    console.error("[instagram/stats] fetch failed", err)
    return NextResponse.json({ connected: false, error: "fetch_failed" })
  }
}
