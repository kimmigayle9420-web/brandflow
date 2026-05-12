import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const GRAPH = "https://graph.facebook.com/v19.0"

type RecentPost = {
  id: string
  caption: string | null
  media_type: string | null
  timestamp: string | null
  like_count: number
  comments_count: number
  reach: number
  impressions: number
}

function sumInsight(data: unknown, metric: string): number {
  // Instagram insights API returns: { data: [ { name, values: [ { value, end_time } ] } ] }
  const arr = (data as { data?: Array<{ name: string; values?: Array<{ value: number }> }> })?.data
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
    return NextResponse.json({ connected: false, error: "not_authenticated" }, { status: 401 })
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_token_expires_at")
    .eq("id", user.id)
    .single()

  if (profileErr || !profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ connected: false })
  }

  const token = profile.instagram_access_token
  const igId = profile.instagram_user_id
  const expiresAt = profile.instagram_token_expires_at

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ connected: false, expired: true })
  }

  try {
    // 1. Account-level facts (followers, media count, username)
    const accountRes = await fetch(
      `${GRAPH}/${igId}?` +
        new URLSearchParams({
          fields: "followers_count,media_count,username",
          access_token: token,
        }).toString(),
      { cache: "no-store" },
    )
    const account = await accountRes.json()
    if (account?.error) {
      console.error("[instagram/stats] account error", account.error)
      return NextResponse.json({ connected: false, error: "graph_error" })
    }

    // 2. 30-day insights — reach, impressions, profile_views
    const until = Math.floor(Date.now() / 1000)
    const since = until - 30 * 24 * 60 * 60
    const insightsRes = await fetch(
      `${GRAPH}/${igId}/insights?` +
        new URLSearchParams({
          metric: "reach,impressions,profile_views",
          period: "day",
          since: String(since),
          until: String(until),
          access_token: token,
        }).toString(),
      { cache: "no-store" },
    )
    const insights = await insightsRes.json()
    const reach = sumInsight(insights, "reach")
    const impressions = sumInsight(insights, "impressions")
    const profileViews = sumInsight(insights, "profile_views")

    // 3. Recent media (6 posts) with per-post insights
    const mediaRes = await fetch(
      `${GRAPH}/${igId}/media?` +
        new URLSearchParams({
          fields:
            "id,caption,media_type,timestamp,like_count,comments_count,insights.metric(reach,impressions)",
          limit: "6",
          access_token: token,
        }).toString(),
      { cache: "no-store" },
    )
    const media = await mediaRes.json()
    const recentPosts: RecentPost[] = Array.isArray(media?.data)
      ? media.data.map((m: Record<string, unknown>) => ({
          id: String(m.id ?? ""),
          caption: (m.caption as string | null) ?? null,
          media_type: (m.media_type as string | null) ?? null,
          timestamp: (m.timestamp as string | null) ?? null,
          like_count: Number(m.like_count ?? 0),
          comments_count: Number(m.comments_count ?? 0),
          reach: sumInsight(m.insights, "reach"),
          impressions: sumInsight(m.insights, "impressions"),
        }))
      : []

    return NextResponse.json({
      connected: true,
      username: account.username ?? null,
      followers: Number(account.followers_count ?? 0),
      mediaCount: Number(account.media_count ?? 0),
      reach,
      impressions,
      profileViews,
      recentPosts,
    })
  } catch (err) {
    console.error("[instagram/stats] fetch failed", err)
    return NextResponse.json({ connected: false, error: "fetch_failed" })
  }
}
