import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { ContentCreatorClient } from "./_components/content-creator-client"
import type { Brand, ContentPillar, SocialAccountsMap } from "@/types"
import { normalizeSocialAccounts, toHandleMap } from "@/lib/social-accounts"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Content hub — BrandFlow",
  description: "Plan, draft, and schedule posts across your content pillars.",
}

export default async function ContentCreatorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: brands }, { data: profile }] = await Promise.all([
    supabase
      .from("brands")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("social_accounts")
      .eq("id", user!.id)
      .single(),
  ])

  const primaryBrand: Brand | null = brands && brands.length > 0 ? brands[0] : null
  const socialAccounts = toHandleMap(
    normalizeSocialAccounts((profile?.social_accounts ?? {}) as SocialAccountsMap | null),
  )

  let initialPillars: ContentPillar[] = []
  if (primaryBrand) {
    const { data: pillars } = await supabase
      .from("content_pillars")
      .select("*")
      .eq("brand_id", primaryBrand.id)
      .order("sort_order")
    initialPillars = pillars ?? []
  }

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#EDE6DC" }}>
      <Header
        title="Content hub"
        description="Filter post ideas by pillar, draft a new one, and schedule when it goes live."
      />
      <div className="flex-1 w-full px-4 py-6 md:px-6 lg:px-10 md:py-8">
        <ContentCreatorClient
          brand={primaryBrand}
          initialPillars={initialPillars}
          socialAccounts={socialAccounts}
          userId={user!.id}
        />
      </div>
    </div>
  )
}
