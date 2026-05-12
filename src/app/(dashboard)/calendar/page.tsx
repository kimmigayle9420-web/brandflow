import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { CalendarClient } from "./_components/calendar-client"
import type { Brand, ContentPillar, Idea } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Calendar — BrandFlow",
  description: "Schedule, drag, and rebalance your week",
}

export default async function CalendarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: brands }, { data: pillarsRaw }] = await Promise.all([
    supabase
      .from("brands")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_pillars")
      .select("*")
      .eq("user_id", user!.id)
      .order("sort_order"),
  ])

  const primaryBrand: Brand | null = brands && brands.length > 0
    ? brands[0]
    : null

  const pillars: ContentPillar[] = primaryBrand
    ? (pillarsRaw ?? []).filter((p) => p.brand_id === primaryBrand.id)
    : []

  let scheduledIdeas: Idea[] = []
  let unscheduledIdeas: Idea[] = []

  if (primaryBrand) {
    // Scheduled: any idea with scheduled_at OR scheduled_date set.
    // Try scheduled_at first; fall back to scheduled_date if that column
    // doesn't exist yet (pre-migration-006 databases).
    const scheduledQ = await supabase
      .from("ideas")
      .select("*")
      .eq("brand_id", primaryBrand.id)
      .or("scheduled_at.not.is.null,scheduled_date.not.is.null")
      .order("scheduled_at", { ascending: true, nullsFirst: false })

    if (scheduledQ.error && /scheduled_at/i.test(scheduledQ.error.message ?? "")) {
      const fallback = await supabase
        .from("ideas")
        .select("*")
        .eq("brand_id", primaryBrand.id)
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true })
      scheduledIdeas = fallback.data ?? []
    } else {
      scheduledIdeas = scheduledQ.data ?? []
    }

    // Unscheduled: ideas with neither scheduled_at nor scheduled_date.
    const unschedQ = await supabase
      .from("ideas")
      .select("*")
      .eq("brand_id", primaryBrand.id)
      .is("scheduled_at", null)
      .is("scheduled_date", null)
      .in("status", ["idea", "draft"])
      .order("created_at", { ascending: false })
      .limit(20)

    if (unschedQ.error && /scheduled_at/i.test(unschedQ.error.message ?? "")) {
      const fallback = await supabase
        .from("ideas")
        .select("*")
        .eq("brand_id", primaryBrand.id)
        .is("scheduled_date", null)
        .in("status", ["idea", "draft"])
        .order("created_at", { ascending: false })
        .limit(20)
      unscheduledIdeas = fallback.data ?? []
    } else {
      unscheduledIdeas = unschedQ.data ?? []
    }
  }

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#EDE6DC" }}>
      <Header
        title="Calendar"
        description="Schedule, drag, and rebalance your week."
      />
      <div className="flex-1 w-full px-4 py-6 md:px-6 lg:px-10 md:py-8">
        <CalendarClient
          brand={primaryBrand}
          pillars={pillars}
          scheduledIdeas={scheduledIdeas}
          unscheduledIdeas={unscheduledIdeas}
        />
      </div>
    </div>
  )
}
