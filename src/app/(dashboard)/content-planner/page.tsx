import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { ContentPlannerClient } from "./_components/content-planner-client"
import type { Brand, ContentPillar, Idea } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Content Planner — BrandFlow",
  description: "Plan your week, rotate your pillars, and build content faster",
}

export default async function ContentPlannerPage() {
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

  let savedIdeas: Idea[] = []
  if (primaryBrand) {
    const { data: ideasData } = await supabase
      .from("ideas")
      .select("*")
      .eq("brand_id", primaryBrand.id)
      .in("status", ["idea", "draft"])
      .order("created_at", { ascending: false })
      .limit(50)
    savedIdeas = ideasData ?? []
  }

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#EDE6DC" }}>
      <Header
        title="Content Planner"
        description="Plan your week, rotate your pillars, and build content faster."
      />
      <div className="flex-1 w-full px-4 py-6 md:px-6 lg:px-10 md:py-8">
        <ContentPlannerClient
          brand={primaryBrand}
          pillars={pillars}
          initialIdeas={savedIdeas}
          userId={user!.id}
        />
      </div>
    </div>
  )
}
