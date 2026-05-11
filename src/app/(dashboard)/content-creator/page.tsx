/*
 * SQL — run in Supabase SQL editor to add a richer content column (optional):
 * ALTER TABLE posts ADD COLUMN IF NOT EXISTS content jsonb;
 *
 * The page currently saves using existing columns:
 *   caption_draft  → hook / caption / carousel topic / reel concept
 *   hashtags       → joined hashtag string
 *   notes          → JSON-stringified structured content (carousel slides, reel script)
 *   format         → 'static' | 'carousel' | 'reel'
 *   status         → 'draft'
 */

import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { ContentCreatorClient } from "./_components/content-creator-client"
import type { Brand } from "@/types"

export default async function ContentCreatorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: brands } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const primaryBrand: Brand | null = brands && brands.length > 0 ? (brands[0] as unknown as Brand) : null

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FAFAF5" }}>
      <Header
        title="Content Creator"
        description="Generate hooks, captions, carousels, reels and images — powered by your brand."
      />
      <div className="flex-1 w-full px-6 lg:px-10 py-8">
        <ContentCreatorClient brand={primaryBrand} />
      </div>
    </div>
  )
}
