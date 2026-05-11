import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import type { Brand, ContentPillar } from "@/types"
import { ContentResearchClient } from "./_components/content-research-client"

export default async function ContentResearchPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch primary brand + saved pillars in parallel
  const [{ data: brands }, ] = await Promise.all([
    supabase
      .from("brands")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ])

  const primaryBrand: Brand | null = brands?.[0] ?? null

  let savedPillars: ContentPillar[] = []
  if (primaryBrand) {
    const brandId = (primaryBrand as Brand).id
    const { data } = await supabase
      .from("content_pillars")
      .select("*")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("brand_id" as any, brandId)
      .order("sort_order")
    savedPillars = (data as ContentPillar[] | null) ?? []
  }

  return (
    <div className="flex flex-col min-h-full bg-[#FAFAF7]">
      <Header
        title="Content Research"
        description="Generate pillars, analyse profiles, and research your niche — all in one place."
      />
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <ContentResearchClient
          brand={primaryBrand}
          initialPillars={savedPillars}
        />
      </div>
    </div>
  )
}
