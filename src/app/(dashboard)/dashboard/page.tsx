"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ArrowRight, Plug, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PLATFORMS, PROFILE, type Pillar, type Platform, type PlatformId, type RecentPost, type Stat } from "@/data/dashboard"
import { Sparkline } from "./_components/sparkline"
import { BarRow } from "./_components/bar-row"
import { PlatformIcon } from "./_components/platform-icon"

// ─── Design tokens ────────────────────────────────────────────────────────────
const TOKENS = {
  bg: "#EDE6DC",
  card: "#F4EEE2",
  cardSoft: "#EFE7D8",
  ink: "#2D2D2D",
  inkSoft: "#4A4944",
  orange: "#E06A33",
  brown: "#8B7261",
  brownSoft: "#C2B5A3",
  hairline: "rgba(45,45,45,0.08)",
  hairlineStrong: "rgba(45,45,45,0.14)",
  fontBody: '"DM Sans", "Inter", system-ui, -apple-system, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
}

const SWATCH: Record<Pillar["swatch"], string> = {
  orange: TOKENS.orange,
  brown: TOKENS.brown,
  ink: TOKENS.ink,
  brownSoft: TOKENS.brownSoft,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatToday(): string {
  const d = new Date()
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" })
  const day = d.toLocaleDateString("en-GB", { day: "numeric" })
  const month = d.toLocaleDateString("en-GB", { month: "long" })
  const year = d.getFullYear()
  return `${weekday} · ${day} ${month} ${year}`
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

// Compact number formatting — 47200 → "47.2K", 1_240_000 → "1.2M"
function formatCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0"
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}M`
  }
  if (n >= 1_000) {
    const v = n / 1_000
    return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}K`
  }
  return n.toLocaleString("en-US")
}

function formatPostDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" })
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" })
  const month = d.toLocaleDateString("en-GB", { month: "short" })
  return `${weekday} · ${day} ${month}`
}

function mediaTypeToFormat(t: string | null | undefined): { format: string; emoji: string } {
  switch (t) {
    case "VIDEO":
      return { format: "Reel", emoji: "🎬" }
    case "CAROUSEL_ALBUM":
      return { format: "Carousel", emoji: "🖼️" }
    case "IMAGE":
    default:
      return { format: "Post", emoji: "📷" }
  }
}

function captionToTitle(caption: string | null | undefined): string {
  if (!caption) return "(no caption)"
  const oneLine = caption.replace(/\s+/g, " ").trim()
  if (oneLine.length <= 56) return oneLine
  return `${oneLine.slice(0, 53)}…`
}

// ─── Real-stats wire-up ───────────────────────────────────────────────────────
type IgStatsPost = {
  id: string
  caption: string | null
  media_type: string | null
  timestamp: string | null
  like_count: number
  comments_count: number
  reach: number
  views: number
}

type IgStats =
  | { connected: false }
  | {
      connected: true
      username: string | null
      profilePictureUrl: string | null
      followers: number
      mediaCount: number
      reach: number
      views: number
      profileViews: number
      recentPosts: IgStatsPost[]
    }

function buildInstagramPlatform(base: Platform, stats: Extract<IgStats, { connected: true }>): Platform {
  // Replace the four stat cards with real numbers. Engagement is computed
  // from recent posts when we have any, otherwise we drop it.
  const recentLikes = stats.recentPosts.reduce((s, p) => s + (p.like_count ?? 0), 0)
  const recentComments = stats.recentPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0)
  const engagementPct =
    stats.followers > 0 && stats.recentPosts.length > 0
      ? ((recentLikes + recentComments) / stats.recentPosts.length / stats.followers) * 100
      : null

  const newStats: Stat[] = [
    {
      label: "Followers",
      value: formatCompact(stats.followers),
      delta: `${stats.mediaCount} posts`,
    },
    {
      label: "Engagement",
      value: engagementPct !== null ? `${engagementPct.toFixed(1)}%` : "—",
      delta: "last 6 posts",
    },
    {
      label: "Reach (30d)",
      value: formatCompact(stats.reach),
      deltaPct: stats.views > 0 ? `${formatCompact(stats.views)} views` : undefined,
    },
    {
      label: "Profile visits",
      value: formatCompact(stats.profileViews),
      highlight: true,
      delta: "last 30 days",
    },
  ]

  const newPosts: RecentPost[] = stats.recentPosts.map((p) => {
    const { format, emoji } = mediaTypeToFormat(p.media_type)
    return {
      format,
      emoji,
      title: captionToTitle(p.caption),
      date: p.timestamp ? formatPostDate(p.timestamp) : "",
      primary: formatCompact(p.reach || p.views || 0),
      primaryLabel: "reach",
      likes: formatCompact(p.like_count ?? 0),
      comments: formatCompact(p.comments_count ?? 0),
    }
  })

  const hasRealPosts = newPosts.length > 0
  return {
    ...base,
    // Once we have real Graph API stats, this platform is no longer preview/sample data.
    // If posts are missing we keep the placeholder posts but flag the platform as preview
    // so the banner stays visible until the user has any real media.
    isPreview: !hasRealPosts,
    stats: newStats,
    posts: hasRealPosts ? newPosts : base.posts,
  }
}

// Human-readable copy for OAuth error codes surfaced via ?error= on the dashboard.
const INSTAGRAM_ERROR_COPY: Record<string, { title: string; body: string }> = {
  instagram_no_pages: {
    title: "No Facebook Page linked to your Instagram",
    body: "Make sure your Instagram is set to a Professional account and connected to a Facebook Page you manage, then try again.",
  },
  instagram_no_ig: {
    title: "No Instagram Business account found",
    body: "Your Facebook account doesn't have an Instagram Business account connected. Open Instagram → Edit Profile → Switch to Professional Account, then link it to your Facebook Page.",
  },
  instagram_not_configured: {
    title: "Instagram connection isn't set up yet",
    body: "BrandFlow is missing the Instagram app credentials. Contact support so we can finish wiring this up.",
  },
  instagram: {
    title: "We couldn't connect Instagram",
    body: "Something went wrong while connecting Instagram. Please try again — if it keeps failing, contact support.",
  },
}

// ─── Top-level page (client component) ────────────────────────────────────────
// useSearchParams forces a Suspense boundary at the page export to keep
// Next.js's static prerender happy. The inner component holds all the
// actual page logic.
export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: TOKENS.bg, minHeight: "100%" }} />}>
      <DashboardPageInner />
    </Suspense>
  )
}

function DashboardPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const errorParam = searchParams.get("error")
  const errorCopy = errorParam ? INSTAGRAM_ERROR_COPY[errorParam] : null

  const dismissError = () => {
    // Strip the ?error= param so the banner doesn't reappear on reload.
    const params = new URLSearchParams(searchParams.toString())
    params.delete("error")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const [active, setActive] = useState<PlatformId>("instagram")
  const [firstName, setFirstName] = useState<string>(PROFILE.firstName)
  const [fullName, setFullName] = useState<string>(PROFILE.fullName)
  const [handle, setHandle] = useState<string>(PROFILE.handle)
  const [igStats, setIgStats] = useState<IgStats | null>(null)
  const [igLoading, setIgLoading] = useState(false)

  // Overlay handle/name from Supabase if available; otherwise keep design defaults
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from("profiles")
        .select("full_name, social_accounts")
        .eq("id", user.id)
        .single()
      if (cancelled || !data) return
      const rawName = data.full_name
      if (rawName) {
        setFullName(rawName)
        setFirstName(rawName.split(" ")[0])
      }
      const social = data.social_accounts
      const platformKey = active === "shorts" ? "youtube" : active
      const entry = social?.[platformKey]
      const h = typeof entry === "string" ? entry : entry?.handle
      if (h) setHandle(String(h).replace(/^@/, ""))
    })()
    return () => {
      cancelled = true
    }
    // re-run when platform changes (handle may differ per platform)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // When the user is on the Instagram tab, fetch real Graph API stats once.
  useEffect(() => {
    if (active !== "instagram") return
    if (igStats !== null || igLoading) return
    let cancelled = false
    setIgLoading(true)
    void (async () => {
      try {
        const res = await fetch("/api/instagram/stats", { cache: "no-store" })
        const json = await res.json()
        if (cancelled) return
        if (json?.connected) {
          setIgStats(json as IgStats)
          if (json.username) setHandle(String(json.username).replace(/^@/, ""))
        } else {
          setIgStats({ connected: false })
        }
      } catch {
        if (!cancelled) setIgStats({ connected: false })
      } finally {
        if (!cancelled) setIgLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, igStats])

  // Use state + effect for time-dependent values so server and client render
  // the same initial string (empty), avoiding React hydration mismatch #425.
  const [today, setToday] = useState("")
  const [currentGreeting, setCurrentGreeting] = useState("")
  useEffect(() => {
    setToday(formatToday())
    setCurrentGreeting(greeting())
  }, [])

  const effectivePlatform: Platform = useMemo(() => {
    const base = PLATFORMS[active]
    if (active === "instagram" && igStats?.connected) {
      return buildInstagramPlatform(base, igStats)
    }
    return base
  }, [active, igStats])

  // On the Instagram tab we must never render the hardcoded stat numbers (47.2K
  // followers, 612K reach, etc.) unless the Graph API has confirmed the account
  // is connected. While the stats request is in flight (igStats === null) we
  // also treat it as "not connected" so the fake numbers never flash on screen.
  const nothingConnected =
    active === "instagram" && (igStats === null || igStats.connected === false)

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: TOKENS.fontBody }}
    >
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-6 md:py-9 space-y-7">

        {errorCopy && (
          <InstagramErrorBanner
            title={errorCopy.title}
            body={errorCopy.body}
            onDismiss={dismissError}
          />
        )}

        {/* ─── Top bar ────────────────────────────────────────────── */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
            >
              {today ? `// ${today}` : ""}
            </p>
            <h1
              className="text-[28px] md:text-[38px] font-medium leading-[1.1] mt-2"
              style={{ color: TOKENS.ink, letterSpacing: "-0.01em" }}
            >
              {currentGreeting},{" "}
              <em style={{ color: TOKENS.orange, fontStyle: "italic", fontWeight: 500 }}>
                {firstName}.
              </em>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PlatformSwitcher active={active} onChange={setActive} />
            {nothingConnected && (
              <a
                href="/api/auth/instagram"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: TOKENS.orange, color: "#FFFFFF" }}
              >
                <Plug className="h-3.5 w-3.5" />
                Connect Instagram
              </a>
            )}
            <Link
              href="/content-creator"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: TOKENS.ink, color: TOKENS.bg }}
            >
              New post <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* ─── Nothing connected empty state ──────────────────────── */}
        {nothingConnected ? (
          <NothingConnectedState firstName={firstName} />
        ) : (
          <>
            {/* Preview banner for platforms whose data is still placeholder */}
            {effectivePlatform.isPreview && (
              <PreviewBanner platformName={effectivePlatform.name} />
            )}

            {/* ─── Profile band ─────────────────────────────────── */}
            <ProfileBand handle={handle} fullName={fullName} platform={effectivePlatform} />

            {/* ─── Stats row ────────────────────────────────────── */}
            <StatsRow platform={effectivePlatform} />

            {/* ─── Two-column body ──────────────────────────────── */}
            <section
              className="grid gap-5"
              style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
            >
              <RecentPostsCard platform={effectivePlatform} />
              <div className="space-y-5">
                <ThisWeekCard platform={effectivePlatform} />
                <AudienceCard platform={effectivePlatform} />
              </div>
            </section>

            {/* ─── Algorithm Watch ──────────────────────────────── */}
            <AlgorithmWatchCard platform={effectivePlatform} />
          </>
        )}

      </div>

      {/* Body-level keyframes for the live pulse */}
      <style jsx global>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%      { transform: scale(1.6); opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ─── Instagram OAuth error banner ────────────────────────────────────────────
// Surfaces the failure reason after the OAuth callback bounces back with
// ?error=... so the user knows what happened and what to do next.
function InstagramErrorBanner({
  title,
  body,
  onDismiss,
}: {
  title: string
  body: string
  onDismiss: () => void
}) {
  return (
    <div
      role="alert"
      className="relative flex items-start gap-3 rounded-2xl px-4 py-3 pr-10"
      style={{
        backgroundColor: "#FBE9DF",
        border: `1px solid ${TOKENS.orange}`,
        color: TOKENS.ink,
      }}
    >
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider shrink-0"
        style={{
          backgroundColor: TOKENS.orange,
          color: "#FFFFFF",
          fontFamily: TOKENS.fontMono,
        }}
      >
        INSTAGRAM
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-snug">{title}</p>
        <p
          className="text-[13px] leading-relaxed mt-1"
          style={{ color: TOKENS.inkSoft }}
        >
          {body}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <a
            href="/api/auth/instagram"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: TOKENS.orange, color: "#FFFFFF" }}
          >
            Try again
          </a>
          <Link
            href="/settings"
            className="text-[12px] font-medium"
            style={{ color: TOKENS.inkSoft }}
          >
            Open settings →
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 inline-flex items-center justify-center w-6 h-6 rounded-full transition-opacity hover:opacity-70"
        style={{ color: TOKENS.inkSoft }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Preview-data banner ─────────────────────────────────────────────────────
// Shown when the visible numbers are still placeholder/sample data — either
// the platform has no live integration yet (TikTok, Shorts) or Instagram is
// connected but posts haven't synced. Explicit copy stops users mistaking the
// numbers for real analytics.
function PreviewBanner({ platformName }: { platformName: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: TOKENS.card,
        border: `1px dashed ${TOKENS.hairlineStrong}`,
      }}
    >
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider shrink-0"
        style={{
          backgroundColor: TOKENS.orange,
          color: "#FFFFFF",
          fontFamily: TOKENS.fontMono,
        }}
      >
        PREVIEW
      </span>
      <p className="text-[13px] leading-relaxed" style={{ color: TOKENS.inkSoft }}>
        {platformName} stats below are sample data — your real numbers will appear here once
        your account syncs.
      </p>
    </div>
  )
}

// ─── Nothing connected empty state ───────────────────────────────────────────
function NothingConnectedState({ firstName }: { firstName: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-[24px]"
      style={{ backgroundColor: TOKENS.card, border: `1px solid ${TOKENS.hairline}` }}
    >
      {/* Icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full mb-6 text-3xl"
        style={{ backgroundColor: TOKENS.bg, border: `1px solid ${TOKENS.hairlineStrong}` }}
        aria-hidden
      >
        📡
      </div>

      <p
        className="text-[11px] uppercase tracking-[0.18em] mb-3"
        style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
      >
        // no accounts connected
      </p>

      <h2
        className="text-2xl md:text-3xl font-medium leading-tight mb-3"
        style={{ color: TOKENS.ink, letterSpacing: "-0.01em" }}
      >
        Nothing to show yet,{" "}
        <em style={{ color: TOKENS.orange, fontStyle: "italic" }}>{firstName}.</em>
      </h2>

      <p
        className="text-[15px] leading-relaxed max-w-[44ch] mb-8"
        style={{ color: TOKENS.inkSoft }}
      >
        Connect your Instagram account and BrandFlow will pull in your real stats, recent posts, and growth data.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <a
          href="/api/auth/instagram"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[15px] font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: TOKENS.orange, color: "#FFFFFF" }}
        >
          <Plug className="h-4 w-4" />
          Connect Instagram
        </a>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 h-12 px-6 rounded-full text-[15px] font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "transparent",
            color: TOKENS.inkSoft,
            border: `1px solid ${TOKENS.hairlineStrong}`,
          }}
        >
          Other platforms →
        </Link>
      </div>
    </div>
  )
}

// ─── Platform switcher (pill) ─────────────────────────────────────────────────
function PlatformSwitcher({
  active,
  onChange,
}: {
  active: PlatformId
  onChange: (id: PlatformId) => void
}) {
  const ids: PlatformId[] = ["instagram", "tiktok", "shorts"]
  return (
    <div
      role="tablist"
      aria-label="Platform"
      className="inline-flex items-center p-1 rounded-full"
      style={{ backgroundColor: TOKENS.card, border: `1px solid ${TOKENS.hairline}` }}
    >
      {ids.map((id) => {
        const p = PLATFORMS[id]
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            title={p.name}
            className="h-8 w-9 rounded-full inline-flex items-center justify-center transition-colors"
            style={
              isActive
                ? { backgroundColor: p.accent, color: "#FFFFFF" }
                : { color: TOKENS.brown }
            }
          >
            <PlatformIcon id={id} size={15} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Profile band ─────────────────────────────────────────────────────────────
function ProfileBand({ handle, fullName, platform }: { handle: string; fullName: string; platform: Platform }) {
  const accent = platform.accent
  return (
    <section
      className="grid gap-6 rounded-[18px] p-6 md:p-7"
      style={{
        backgroundColor: TOKENS.card,
        border: `1px solid ${TOKENS.hairline}`,
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
      }}
    >
      {/* Left — identity */}
      <div className="flex items-start gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-2xl font-medium"
          style={{
            backgroundColor: TOKENS.bg,
            color: TOKENS.ink,
            border: `1px solid ${TOKENS.hairlineStrong}`,
          }}
          aria-hidden
        >
          {fullName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
          >
            // creator
          </p>
          <h2 className="text-xl md:text-2xl font-medium leading-tight" style={{ color: TOKENS.ink }}>
            {fullName}
          </h2>
          <p className="text-sm mt-1" style={{ color: accent }}>
            @{handle}
          </p>
          <p className="text-[13px] mt-3 leading-relaxed max-w-[36ch]" style={{ color: TOKENS.inkSoft }}>
            {PROFILE.bio}
          </p>
        </div>
      </div>

      {/* Right — pillars 2×2 */}
      <div>
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-3"
          style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
        >
          // content mix
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROFILE.pillars.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: TOKENS.bg, border: `1px solid ${TOKENS.hairline}` }}
            >
              <span
                className="block w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: SWATCH[p.swatch] }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate" style={{ color: TOKENS.ink }}>
                  {p.name}
                </p>
              </div>
              <span
                className="text-[12px] tabular-nums font-medium shrink-0"
                style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}
              >
                {p.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────
function StatsRow({ platform }: { platform: Platform }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {platform.stats.map((s) => {
        const isHighlight = s.highlight
        return (
          <div
            key={s.label}
            className="rounded-[18px] p-5"
            style={{
              backgroundColor: isHighlight ? platform.accent : TOKENS.card,
              color: isHighlight ? "#FFFFFF" : TOKENS.ink,
              border: isHighlight ? "none" : `1px solid ${TOKENS.hairline}`,
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="text-[10px] uppercase tracking-[0.16em]"
                style={{
                  color: isHighlight ? "rgba(255,255,255,0.85)" : TOKENS.brown,
                  fontFamily: TOKENS.fontMono,
                }}
              >
                {s.label}
              </span>
              {s.deltaPct && (
                <span
                  className="text-[10px] tabular-nums font-medium"
                  style={{
                    color: isHighlight ? "rgba(255,255,255,0.95)" : TOKENS.orange,
                    fontFamily: TOKENS.fontMono,
                  }}
                >
                  {s.deltaPct}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <p
                className="text-[28px] md:text-[32px] font-medium leading-none tabular-nums"
                style={{ letterSpacing: "-0.01em" }}
              >
                {s.value}
              </p>
              {s.sparkline && (
                <Sparkline
                  data={s.sparkline}
                  color={isHighlight ? "rgba(255,255,255,0.9)" : platform.accent}
                  height={28}
                  width={84}
                />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              {s.delta && (
                <span
                  className="text-[11px] tabular-nums"
                  style={{
                    color: isHighlight ? "rgba(255,255,255,0.85)" : TOKENS.inkSoft,
                    fontFamily: TOKENS.fontMono,
                  }}
                >
                  {s.delta}
                </span>
              )}
              {!s.delta && !s.goal && <span />}

              {s.goal && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className="block flex-1 h-1 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: isHighlight
                        ? "rgba(255,255,255,0.25)"
                        : "rgba(45,45,45,0.10)",
                    }}
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (s.goal.current / s.goal.max) * 100)}%`,
                        backgroundColor: isHighlight ? "#FFFFFF" : platform.accent,
                      }}
                    />
                  </span>
                  <span
                    className="text-[10px] shrink-0"
                    style={{
                      color: isHighlight ? "rgba(255,255,255,0.85)" : TOKENS.brown,
                      fontFamily: TOKENS.fontMono,
                    }}
                  >
                    {s.goal.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ─── Recent posts ─────────────────────────────────────────────────────────────
function RecentPostsCard({ platform }: { platform: Platform }) {
  return (
    <div
      className="rounded-[18px] p-5 md:p-6"
      style={{ backgroundColor: TOKENS.card, border: `1px solid ${TOKENS.hairline}` }}
    >
      <CardHeader eyebrow="// recent posts" title={`On ${platform.name}`} />

      <ul className="mt-4 divide-y" style={{ borderColor: TOKENS.hairline }}>
        {platform.posts.map((post, i) => (
          <li
            key={i}
            className="grid items-center gap-4 py-3.5"
            style={{ gridTemplateColumns: "44px minmax(0, 1fr) auto" }}
          >
            {/* thumbnail with format badge */}
            <div className="relative shrink-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: TOKENS.bg, border: `1px solid ${TOKENS.hairline}` }}
                aria-hidden
              >
                {post.emoji}
              </div>
            </div>

            {/* title + meta */}
            <div className="min-w-0">
              <p className="text-[14px] font-medium truncate" style={{ color: TOKENS.ink }}>
                {post.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
                  style={{
                    backgroundColor: "rgba(224,106,51,0.10)",
                    color: TOKENS.orange,
                  }}
                >
                  {post.format}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
                >
                  {post.date}
                </span>
              </div>
            </div>

            {/* 3 stats */}
            <div className="flex items-center gap-5 shrink-0">
              <MicroStat value={post.primary}  label={post.primaryLabel} />
              <MicroStat value={post.likes}    label="likes"            />
              <MicroStat value={post.comments} label="comments"         />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MicroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-right">
      <p
        className="text-[13px] font-medium tabular-nums leading-none"
        style={{ color: TOKENS.ink }}
      >
        {value}
      </p>
      <p
        className="text-[10px] mt-1 uppercase tracking-wider"
        style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
      >
        {label}
      </p>
    </div>
  )
}

// ─── This week ────────────────────────────────────────────────────────────────
function ThisWeekCard({ platform }: { platform: Platform }) {
  const tw = platform.thisWeek
  return (
    <div
      className="rounded-[18px] p-5 md:p-6"
      style={{ backgroundColor: TOKENS.card, border: `1px solid ${TOKENS.hairline}` }}
    >
      <CardHeader eyebrow="// this week" title={tw.range} />

      <ul className="mt-4 space-y-2.5">
        {tw.rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-3">
            <span className="text-[12px]" style={{ color: TOKENS.inkSoft }}>
              {r.label}
            </span>
            <span
              className="text-[14px] font-medium tabular-nums"
              style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}
            >
              {r.value}
            </span>
          </li>
        ))}
      </ul>

      {/* dot calendar */}
      <div
        className="mt-5 pt-5 grid grid-cols-7 gap-2"
        style={{ borderTop: `1px solid ${TOKENS.hairline}` }}
      >
        {tw.days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1.5">
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: d.today ? TOKENS.orange : TOKENS.brown, fontFamily: TOKENS.fontMono }}
            >
              {d.d}
            </span>
            <span
              className="block w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: d.posted
                  ? platform.accent
                  : "transparent",
                border: d.posted
                  ? "none"
                  : `1px solid ${TOKENS.hairlineStrong}`,
                outline: d.today ? `2px solid ${TOKENS.orange}` : "none",
                outlineOffset: d.today ? "2px" : undefined,
              }}
              aria-hidden
            />
            <span
              className="text-[10px] tabular-nums"
              style={{ color: TOKENS.inkSoft, fontFamily: TOKENS.fontMono }}
            >
              {d.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Audience ─────────────────────────────────────────────────────────────────
function AudienceCard({ platform }: { platform: Platform }) {
  return (
    <div
      className="rounded-[18px] p-5 md:p-6"
      style={{ backgroundColor: TOKENS.card, border: `1px solid ${TOKENS.hairline}` }}
    >
      <CardHeader eyebrow="// audience" title={platform.audience.title} />

      <div className="mt-5">
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-3"
          style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
        >
          Age & gender
        </p>
        <BarRow rows={platform.audience.demographics} accent={platform.accent} max={50} />
      </div>

      <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${TOKENS.hairline}` }}>
        <p
          className="text-[10px] uppercase tracking-[0.18em] mb-3"
          style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
        >
          Top geo
        </p>
        <BarRow rows={platform.audience.countries} accent={TOKENS.brown} max={40} />
      </div>
    </div>
  )
}

// ─── Algorithm Watch ──────────────────────────────────────────────────────────
function AlgorithmWatchCard({ platform }: { platform: Platform }) {
  const aw = platform.algorithmWatch
  return (
    <section
      className="rounded-[18px] p-5 md:p-7"
      style={{ backgroundColor: TOKENS.card, border: `1px solid ${TOKENS.hairline}` }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
          >
            // algorithm watch
          </p>
          <h3 className="text-[20px] md:text-[22px] font-medium leading-tight" style={{ color: TOKENS.ink }}>
            What changed on{" "}
            <em style={{ color: platform.accent, fontStyle: "italic", fontWeight: 500 }}>
              {platform.name}
            </em>
          </h3>
        </div>

        <div
          className="inline-flex items-center gap-2 h-7 px-2.5 rounded-full"
          style={{ backgroundColor: TOKENS.bg, border: `1px solid ${TOKENS.hairline}` }}
        >
          <span className="relative inline-flex w-1.5 h-1.5">
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: "#3D8F4B", animation: "pulseDot 1.8s ease-out infinite" }}
            />
            <span className="relative block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#3D8F4B" }} />
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.16em]"
            style={{ color: TOKENS.inkSoft, fontFamily: TOKENS.fontMono }}
          >
            live
          </span>
        </div>
      </div>

      {/* Scan row */}
      <div
        className="mt-5 grid grid-cols-2 gap-4 rounded-xl px-4 py-3"
        style={{ backgroundColor: TOKENS.bg, border: `1px solid ${TOKENS.hairline}` }}
      >
        <ScanCell label="Last scan" value={aw.lastScan} />
        <ScanCell label="Next scan" value={aw.nextScan} />
      </div>

      {/* Changelog */}
      <ul className="mt-5 space-y-4">
        {aw.entries.map((entry, i) => (
          <li
            key={i}
            className="grid gap-4"
            style={{ gridTemplateColumns: "76px minmax(0, 1fr) auto" }}
          >
            <div>
              <span
                className="inline-block px-2 py-1 rounded text-[10px] uppercase tracking-wider"
                style={{
                  backgroundColor: TOKENS.bg,
                  color: TOKENS.brown,
                  fontFamily: TOKENS.fontMono,
                  border: `1px solid ${TOKENS.hairline}`,
                }}
              >
                {entry.date}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-snug" style={{ color: TOKENS.ink }}>
                {entry.headline}
              </p>
              <p className="text-[12px] mt-1 leading-relaxed" style={{ color: TOKENS.inkSoft }}>
                {entry.signal}
              </p>
            </div>
            <div className="shrink-0 self-center">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium"
                style={{ color: platform.accent, fontFamily: TOKENS.fontMono }}
              >
                BrandFlow adapts <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Prediction */}
      <p
        className="mt-5 pt-5 text-[13px] italic leading-relaxed"
        style={{
          color: TOKENS.inkSoft,
          borderTop: `1px solid ${TOKENS.hairline}`,
        }}
      >
        {aw.prediction}
      </p>
    </section>
  )
}

function ScanCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.16em] mb-1"
        style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
      >
        {label}
      </p>
      <p
        className="text-[13px] tabular-nums"
        style={{ color: TOKENS.ink, fontFamily: TOKENS.fontMono }}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Shared card header ───────────────────────────────────────────────────────
function CardHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.18em] mb-1"
        style={{ color: TOKENS.brown, fontFamily: TOKENS.fontMono }}
      >
        {eyebrow}
      </p>
      <h3 className="text-[16px] font-medium" style={{ color: TOKENS.ink }}>
        {title}
      </h3>
    </div>
  )
}
