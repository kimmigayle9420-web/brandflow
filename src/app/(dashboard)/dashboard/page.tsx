import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getInitials, formatDate } from "@/lib/utils"
import { SocialConnect } from "./_components/social-connect"
import { PillarsGenerator } from "./_components/pillars-generator"
import { NicheResearch } from "./_components/niche-research"
import { ProfileResearch } from "./_components/profile-research"
import type { Brand } from "@/types"

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
            <BrandProfileCards brand={primaryBrand} totalBrands={brands?.length ?? 1} />
          )}
        </section>

        {/* ─── Section 2: Connect Social Platforms ────────────────── */}
        <section>
          <SectionHeader
            title="Connect Social Platforms"
            subtitle="Link your accounts to start scheduling content"
          />
          <SocialConnect initialAccounts={socialAccounts} />
        </section>

        {/* ─── Section 3: Content Pillars Generator ───────────────── */}
        <section>
          <SectionHeader
            title="Content Pillars Generator"
            subtitle="Enter your niche to generate AI-powered content pillars"
          />
          <PillarsGenerator defaultNiche={primaryBrand?.niche ?? ""} brandId={primaryBrand?.id} />
        </section>

        {/* ─── Section 4: Niche Research ──────────────────────────── */}
        <section>
          <SectionHeader
            title="Niche Research"
            subtitle="Trending topics and content ideas for your niche"
          />
          <NicheResearch niche={primaryBrand?.niche ?? "content creation"} />
        </section>

        {/* ─── Section 5: Research a Profile or Website ───────────── */}
        <section>
          <SectionHeader
            title="Research a Profile or Website"
            subtitle="Paste any social profile or website URL to extract brand intelligence"
          />
          <ProfileResearch />
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

function BrandProfileCards({ brand, totalBrands }: { brand: Brand; totalBrands: number }) {
  const initials = getInitials(brand.name)

  const infoCards = [
    { label: "Brand Name", value: brand.name, emoji: "🏷️" },
    { label: "Niche", value: brand.niche, emoji: "🎯" },
    {
      label: "Tone of Voice",
      value: brand.tone_of_voice ?? "Not specified",
      emoji: "🎙️",
    },
  ]

  return (
    <div className="space-y-4">
      {/* Brand header card */}
      <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm">
        <CardContent className="flex items-center gap-5 py-5 px-6">
          {/* Avatar */}
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: brand.primary_color || "#6366f1" }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 truncate">{brand.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{brand.niche}</p>
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-500 hover:text-indigo-700 mt-1.5 inline-block"
              >
                {brand.website_url}
              </a>
            )}
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Created
            </p>
            <p className="text-sm font-medium text-slate-600">{formatDate(brand.created_at)}</p>
            {totalBrands > 1 && (
              <Link href="/brands">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 h-auto p-0"
                >
                  View all brands →
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info cards grid — 3-up */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {infoCards.map((card) => (
          <Card
            key={card.label}
            className="bg-white border-0 ring-1 ring-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{card.emoji}</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  {card.label}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-snug">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Target Audience — full-width horizontal banner */}
      <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="flex items-center gap-4 py-3.5 px-5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm">👥</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Target Audience
            </p>
          </div>
          <div className="w-px h-4 bg-slate-200 shrink-0" />
          <p className="text-sm font-semibold text-slate-700 leading-snug">
            {brand.target_audience ?? "Not specified"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
