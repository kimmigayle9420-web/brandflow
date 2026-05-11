import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getInitials } from "@/lib/utils"
import { SocialConnect } from "./_components/social-connect"
import type { Brand, ContentPillar } from "@/types"

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: brands }, profileResult] = await Promise.all([
    supabase
      .from("brands")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("full_name, social_accounts")
      .eq("id", user!.id)
      .single(),
  ])

  const firstName = profileResult.data?.full_name?.split(" ")[0] ?? "there"
  const primaryBrand = brands?.[0] ?? null
  const socialAccounts = (profileResult.data?.social_accounts ?? {}) as Record<string, string>

  // Fetch content pillars for the primary brand
  let pillars: ContentPillar[] | null = null
  if (primaryBrand) {
    const { data } = await supabase
      .from("content_pillars")
      .select("id, name, color, sort_order")
      .eq("brand_id", primaryBrand.id)
      .order("sort_order")
    pillars = data ?? []
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      <Header title="Dashboard" description={`Welcome back, ${firstName}! 👋`} />

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-12">

        {/* ─── Section 1: Brand Profile ───────────────────────────── */}
        <section>
          <SectionHeader
            title="Brand Profile"
            subtitle="Your brand identity at a glance"
            action={
              primaryBrand ? (
                <Link href={`/brands/${primaryBrand.id}/edit`}>
                  <Button variant="outline" size="sm" className="text-slate-600 hover:text-slate-900">
                    Edit Brand
                  </Button>
                </Link>
              ) : null
            }
          />

          {!primaryBrand ? (
            <EmptyBrandState />
          ) : (
            <BrandProfileCard brand={primaryBrand} />
          )}
        </section>

        {/* ─── Section 2: Social Profiles ─────────────────────────── */}
        <section>
          <SectionHeader
            title="Social Profiles"
            subtitle="Your connected social accounts"
          />
          <SocialConnect initialAccounts={socialAccounts} />
        </section>

        {/* ─── Section 3: Content Pillars ─────────────────────────── */}
        <section>
          <SectionHeader
            title="Content Pillars"
            subtitle="Your saved topic pillars"
          />
          <ContentPillarsSummary pillars={pillars} hasBrand={!!primaryBrand} />
        </section>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function EmptyBrandState() {
  return (
    <Card className="border-2 border-dashed border-indigo-100 bg-white shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 text-3xl">
          ✨
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1.5">
          Set up your brand profile
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Define your brand identity — niche, audience, tone, and colors — to unlock all content planning tools.
        </p>
        <Link href="/brands/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 font-medium">
            Create your brand →
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function BrandProfileCard({ brand }: { brand: Brand }) {
  const initials = getInitials(brand.name)

  return (
    <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm">
      <CardContent className="p-6">
        {/* Top row: avatar + name + niche pill + tone */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: brand.primary_color || "#6366f1" }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Name + niche pill */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-2xl font-bold text-slate-900 leading-tight">{brand.name}</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 shrink-0">
                {brand.niche}
              </span>
            </div>

            {/* Tone of voice */}
            <p className="text-sm text-slate-500 mt-1.5">
              <span className="font-medium text-slate-600">Tone:</span>{" "}
              {brand.tone_of_voice ?? "Not specified"}
            </p>
          </div>
        </div>

        {/* Target audience — full-width strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest shrink-0 mt-0.5 w-28">
            Target Audience
          </p>
          <p className="text-sm text-slate-700 font-medium leading-snug">
            {brand.target_audience ?? "Not specified"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ContentPillarsSummary({
  pillars,
  hasBrand,
}: {
  pillars: ContentPillar[] | null
  hasBrand: boolean
}) {
  if (!hasBrand) {
    return (
      <p className="text-sm text-slate-400">
        Create your brand first to start building content pillars.
      </p>
    )
  }

  if (!pillars || pillars.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No pillars saved yet —{" "}
        <Link
          href="/content-research"
          className="text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
        >
          go to Content Research to generate some
        </Link>
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pillars.map((pillar) => (
        <span
          key={pillar.id}
          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border"
          style={{
            backgroundColor: pillar.color + "18",
            color: pillar.color,
            borderColor: pillar.color + "50",
          }}
        >
          {pillar.name}
        </span>
      ))}
    </div>
  )
}
