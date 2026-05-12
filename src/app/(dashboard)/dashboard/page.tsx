import { createClient } from "@/lib/supabase/server"
import type { Metadata } from "next"
import { PlatformDashboard } from "./_components/platform-dashboard"

export const metadata: Metadata = {
  title: "Dashboard — BrandFlow",
  description: "Your creative brand hub",
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // YYYY-MM-DD in the server's local time — adequate for upcoming filter
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: brands },
    profileResult,
    upcomingResult,
    scheduledCountResult,
    ideasCountResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("profiles")
      .select("full_name, social_accounts")
      .eq("id", user!.id)
      .single(),
    (supabase.from("ideas") as any)
      .select("id, title, format, scheduled_date, status")
      .eq("user_id", user!.id)
      .not("scheduled_date", "is", null)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(3),
    (supabase.from("ideas") as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .not("scheduled_date", "is", null)
      .gte("scheduled_date", today),
    supabase
      .from("ideas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id),
  ])

  const firstName = profileResult.data?.full_name?.split(" ")[0] ?? "there"
  const primaryBrand = brands?.[0] ?? null
  const socialAccounts = (profileResult.data?.social_accounts ?? {}) as Record<string, string>

  let pillarsCount = 0
  if (primaryBrand) {
    const { count } = await supabase
      .from("content_pillars")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", primaryBrand.id)
    pillarsCount = count ?? 0
  }

  const upcomingIdeas = (upcomingResult.data ?? []) as {
    id: string
    title: string
    format: "post" | "carousel" | "reel"
    scheduled_date: string | null
    status: "idea" | "draft" | "scheduled" | "posted"
  }[]

  return (
    <PlatformDashboard
      firstName={firstName}
      brandName={primaryBrand?.name ?? null}
      socialAccounts={socialAccounts}
      upcomingIdeas={upcomingIdeas}
      counts={{
        scheduled: scheduledCountResult.count ?? 0,
        ideas: ideasCountResult.count ?? 0,
        pillars: pillarsCount,
      }}
    />
  )
}
