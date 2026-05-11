import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { ContentPlannerClient } from "./_components/content-planner-client"
import type { Brand, ContentPillar, Idea } from "@/types"

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
      .order("sort_order"),
  ])

  const primaryBrand: Brand | null = brands && brands.length > 0
    ? (brands[0] as unknown as Brand)
    : null

  // Filter pillars to the primary brand
  const pillars: ContentPillar[] = primaryBrand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((pillarsRaw ?? []) as any[]).filter((p: any) => p.brand_id === primaryBrand.id) as ContentPillar[]
    : []

  // Fetch saved ideas for the ideas bank sidebar
  let savedIdeas: Idea[] = []
  if (primaryBrand) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ideasData } = await (supabase.from("ideas") as any)
      .select("*")
      .eq("brand_id", primaryBrand.id)
      .in("status", ["idea", "draft"])
      .order("created_at", { ascending: false })
      .limit(50)
    savedIdeas = (ideasData ?? []) as Idea[]
  }

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FAFAF5" }}>
      <Header
        title="Content Planner"
        description="Plan your week, rotate your pillars, and build content faster."
      />
      <div className="flex-1 w-full px-6 lg:px-10 py-8">
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
