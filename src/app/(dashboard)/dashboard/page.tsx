import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getInitials } from "@/lib/utils"
import { SocialConnect } from "./_components/social-connect"
import type { Brand, ContentPillar } from "@/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard — BrandFlow",
  description: "Your creative brand hub",
}

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

  // Fetch idea stats for the primary brand
  let ideasSavedCount = 0
  let postsScheduledCount = 0
  if (primaryBrand) {
    const [savedRes, scheduledRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("ideas") as any)
        .select("id", { count: "exact", head: true })
        .eq("brand_id", primaryBrand.id)
        .eq("status", "idea"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("ideas") as any)
        .select("id", { count: "exact", head: true })
        .eq("brand_id", primaryBrand.id)
        .eq("status", "scheduled"),
    ])
    ideasSavedCount = savedRes.count ?? 0
    postsScheduledCount = scheduledRes.count ?? 0
  }
  const pillarsActiveCount = pillars?.length ?? 0
  const platformsConnectedCount = Object.keys(socialAccounts).length

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FAFAF5" }}>
      {/* Warm custom page header — looser and more personal than the generic Header */}
      <div className="px-4 pt-6 pb-5 md:px-8 md:pt-8 md:pb-6" style={{ borderBottom: "1px solid #E8E0D5" }}>
        <h1 className="text-2xl md:text-4xl font-semibold leading-tight" style={{ color: "#2D1810" }}>
          Good to see you, {firstName} 👋
        </h1>
        <p className="mt-1.5 text-base" style={{ color: "#8A7060" }}>
          Here&apos;s your creative brand hub
        </p>
      </div>

      <div className="flex-1 w-full max-w-5xl px-4 py-6 md:px-8 md:py-10 space-y-10 md:space-y-12">

        {/* ─── Section 0: Platform Stats ────────────────────────────── */}
        <section>
          <SectionHeader
            title="Platform Stats"
            subtitle="A quick pulse on your content + connected platforms"
          />
          <PlatformStats
            postsScheduled={postsScheduledCount}
            ideasSaved={ideasSavedCount}
            pillarsActive={pillarsActiveCount}
            platformsConnected={platformsConnectedCount}
            socialAccounts={socialAccounts}
          />
        </section>

        {/* ─── Section 1: Brand Profile ───────────────────────────── */}
        <section>
          <SectionHeader
            title="Brand Profile"
            subtitle="Your brand identity at a glance"
            action={
              primaryBrand ? (
                <Link href="/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    style={{ borderColor: "#E8D8D0", color: "#7A5C50" }}
                  >
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
          <div
            className="p-6 rounded-3xl"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)" }}
          >
            <SocialConnect initialAccounts={socialAccounts} />
          </div>
        </section>

        {/* ─── Section 3: Content Pillars ─────────────────────────── */}
        <section>
          <SectionHeader
            title="Content Pillars"
            subtitle={primaryBrand ? `${pillars?.length ?? 0} of 6 pillars defined` : "Your saved topic pillars"}
          />
          <div
            className="p-6 rounded-3xl"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)" }}
          >
            <ContentPillarsSummary pillars={pillars} hasBrand={!!primaryBrand} />
          </div>
        </section>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; emoji: string; bg: string }> = {
  instagram: { label: "Instagram", emoji: "📸", bg: "linear-gradient(135deg, #F97066 0%, #E0A050 100%)" },
  tiktok:    { label: "TikTok",    emoji: "🎵", bg: "linear-gradient(135deg, #2D1810 0%, #4A3428 100%)" },
  youtube:   { label: "YouTube",   emoji: "▶️", bg: "linear-gradient(135deg, #E05050 0%, #C03030 100%)" },
  twitter:   { label: "X",         emoji: "𝕏",  bg: "linear-gradient(135deg, #4A3428 0%, #2D1810 100%)" },
  pinterest: { label: "Pinterest", emoji: "📌", bg: "linear-gradient(135deg, #E05070 0%, #C03050 100%)" },
  facebook:  { label: "Facebook",  emoji: "👥", bg: "linear-gradient(135deg, #5070D0 0%, #3050A0 100%)" },
  linkedin:  { label: "LinkedIn",  emoji: "💼", bg: "linear-gradient(135deg, #3050A0 0%, #1D3D80 100%)" },
}

function StatCard({
  label, value, hint,
}: {
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: "#FFFFFF", boxShadow: "0 2px 12px rgba(180, 100, 60, 0.07)", border: "1px solid #F0E8E0" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#A89080" }}>
        {label}
      </p>
      <p className="text-3xl font-bold leading-none" style={{ color: "#F97066" }}>
        {value}
      </p>
      {hint && (
        <p className="text-[11px]" style={{ color: "#8A7060" }}>{hint}</p>
      )}
    </div>
  )
}

function PlatformStats({
  postsScheduled,
  ideasSaved,
  pillarsActive,
  platformsConnected,
  socialAccounts,
}: {
  postsScheduled: number
  ideasSaved: number
  pillarsActive: number
  platformsConnected: number
  socialAccounts: Record<string, string>
}) {
  const platformEntries = Object.entries(socialAccounts).filter(([, h]) => !!h)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Posts Scheduled"
          value={postsScheduled}
          hint={postsScheduled === 0 ? "Plan your first post" : "In your planner"}
        />
        <StatCard
          label="Ideas Saved"
          value={ideasSaved}
          hint={ideasSaved === 0 ? "Save ideas as you go" : "In your ideas bank"}
        />
        <StatCard
          label="Pillars Active"
          value={pillarsActive}
          hint={pillarsActive === 0 ? "Define 3–6 themes" : `of 6 themes`}
        />
        <StatCard
          label="Platforms"
          value={platformsConnected}
          hint={platformsConnected === 0 ? "Connect a profile" : "Connected"}
        />
      </div>

      {platformEntries.length > 0 ? (
        <div
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#A89080" }}>
            Connected Profiles
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {platformEntries.map(([id, handle]) => {
              const meta = PLATFORM_META[id] ?? { label: id, emoji: "🔗", bg: "linear-gradient(135deg, #8A7060 0%, #5A3828 100%)" }
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ backgroundColor: "#FAFAF5", border: "1px solid #F0E8E0" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: meta.bg, color: "white" }}
                  >
                    {meta.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold" style={{ color: "#2D1810" }}>{meta.label}</p>
                    <p className="text-xs truncate" style={{ color: "#8A7060" }}>{handle}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#FFF8F4", border: "1px dashed #E8D8D0" }}
        >
          <p className="text-sm" style={{ color: "#8A7060" }}>
            No platforms connected yet — connect Instagram, TikTok or YouTube below to see per-platform stats here.
          </p>
        </div>
      )}
    </div>
  )
}

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
        <h2 className="text-lg font-semibold" style={{ color: "#2D1810" }}>{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: "#8A7060" }}>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function EmptyBrandState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed text-center"
      style={{ borderColor: "#E8D8D0", backgroundColor: "#FFF8F4" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-2xl"
        style={{ backgroundColor: "#FEE8E4" }}
      >
        ✨
      </div>
      <h3 className="text-base font-semibold mb-1.5" style={{ color: "#2D1810" }}>
        Set up your brand profile
      </h3>
      <p className="text-sm max-w-sm mb-6" style={{ color: "#8A7060" }}>
        Define your brand identity — niche, audience, tone, and colors — to unlock all content planning tools.
      </p>
      <Link href="/settings">
        <Button
          className="rounded-xl font-medium hover:opacity-90"
          style={{ backgroundColor: "#F97066", color: "white" }}
        >
          Set up your brand →
        </Button>
      </Link>
    </div>
  )
}

function BrandProfileCard({ brand }: { brand: Brand }) {
  const initials = getInitials(brand.name)

  return (
    <div
      className="p-6 rounded-3xl"
      style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)" }}
    >
      {/* Colour gradient bar */}
      <div
        className="h-1.5 rounded-full mb-5"
        style={{
          background: `linear-gradient(to right, ${brand.primary_color ?? "#F97066"}, ${brand.secondary_color ?? "#E8956D"})`,
        }}
      />

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
            style={{ backgroundColor: brand.primary_color || "#F97066" }}
          >
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name + niche pill */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3
              className="text-xl md:text-3xl font-semibold leading-tight"
              style={{ color: "#2D1810" }}
            >
              {brand.name}
            </h3>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0"
              style={{ backgroundColor: "#FEF3DC", color: "#8B5E10" }}
            >
              {brand.niche}
            </span>
          </div>

          {/* Tone of voice */}
          <p className="text-sm mt-1.5" style={{ color: "#8A7060" }}>
            <span className="font-medium" style={{ color: "#6A5048" }}>Tone: </span>
            {brand.tone_of_voice ?? "Not specified"}
          </p>
        </div>
      </div>

      {/* Target audience */}
      <div
        className="mt-5 pt-4 flex items-start gap-4"
        style={{ borderTop: "1px solid #F0E8E0" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest shrink-0 mt-0.5 w-28"
          style={{ color: "#A89080" }}
        >
          Target Audience
        </p>
        <p className="text-sm font-medium leading-snug whitespace-pre-line" style={{ color: "#4A3428" }}>
          {(brand.target_audience ?? "Not specified").replace(/\* /g, "• ").replace(/\*/g, "")}
        </p>
      </div>
    </div>
  )
}

// Distinct warm pastel backgrounds cycling per pillar index
const PILLAR_PALETTES = [
  { bg: "#FEE8E4", text: "#B03020", dot: "#F97066" }, // coral
  { bg: "#E4F0E8", text: "#2D6040", dot: "#4CAF70" }, // sage
  { bg: "#FEF3DC", text: "#8B5E10", dot: "#F0A020" }, // amber
  { bg: "#EEE8F8", text: "#5040A0", dot: "#9070E0" }, // lavender
  { bg: "#FEF0E0", text: "#C05820", dot: "#E88040" }, // peach
  { bg: "#FDEAEF", text: "#B03050", dot: "#E05070" }, // rose
]

function ContentPillarsSummary({
  pillars,
  hasBrand,
}: {
  pillars: ContentPillar[] | null
  hasBrand: boolean
}) {
  if (!hasBrand) {
    return (
      <p className="text-sm" style={{ color: "#8A7060" }}>
        Create your brand first to start building content pillars.
      </p>
    )
  }

  if (!pillars || pillars.length === 0) {
    return (
      <p className="text-sm" style={{ color: "#8A7060" }}>
        No pillars saved yet —{" "}
        <Link
          href="/content-creator"
          className="hover:underline transition-colors"
          style={{ color: "#F97066" }}
        >
          go to Content Creator to generate some
        </Link>
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {pillars.map((pillar, i) => {
        const palette = PILLAR_PALETTES[i % PILLAR_PALETTES.length]
        return (
          <div
            key={pillar.id}
            className="p-4 rounded-2xl"
            style={{ backgroundColor: palette.bg }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: palette.dot }}
              />
              <p className="text-sm font-semibold" style={{ color: palette.text }}>
                {pillar.name}
              </p>
            </div>
          </div>
        )
      })}
      {pillars.length < 6 && (
        <Link href="/content-pillars" className="block">
          <div
            className="p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 min-h-[56px] transition-all hover:border-[#F97066]"
            style={{ borderColor: "#E8D8D0" }}
          >
            <span className="text-sm" style={{ color: "#A08070" }}>+ Add pillar</span>
          </div>
        </Link>
      )}
    </div>
  )
}
