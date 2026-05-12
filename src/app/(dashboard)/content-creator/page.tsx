import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { ContentCreatorClient } from "./_components/content-creator-client"
import type { Brand, ContentPillar, SocialAccountsMap } from "@/types"
import { normalizeSocialAccounts, toHandleMap } from "@/lib/social-accounts"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Content Creator — BrandFlow",
  description: "Research your niche, manage pillars, and generate content",
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

  const primaryBrand: Brand | null = brands && brands.length > 0 ? (brands[0] as unknown as Brand) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socialAccounts = toHandleMap(
    normalizeSocialAccounts(((profile as any)?.social_accounts ?? {}) as SocialAccountsMap | null),
  )

  let initialPillars: ContentPillar[] = []
  if (primaryBrand) {
    const { data: pillars } = await supabase
      .from("content_pillars")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("*")
      .eq("brand_id" as any, primaryBrand.id)
      .order("sort_order")
    initialPillars = (pillars as ContentPillar[] | null) ?? []
  }

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#EDE6DC" }}>
      <Header
        title="Content Creator"
        description="Research your niche, manage pillars, and generate content — all in one place."
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
