"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Instagram,
  Play,
  Music2,
  ExternalLink,
  PenLine,
  CalendarDays,
  Sparkles,
  TrendingUp,
  Heart,
  Eye,
  Clock,
  Users,
  Percent,
  MousePointerClick,
  Film,
  Image as ImageIcon,
  LayoutGrid,
  CircleDot,
} from "lucide-react"
import type { Idea } from "@/types"

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#EDE6DC",        // cream
  surface: "#FFFFFF",   // card
  surfaceAlt: "#F6EFE4", // soft inset
  brick: "#E06A33",     // accent
  brickDeep: "#C25627",
  graphite: "#2D2D2D",  // primary text
  ink: "#4A4944",       // body text
  concrete: "#C2B5A3",  // muted
  hairline: "#D9CFBE",  // divider
}

// ─── Platform config ──────────────────────────────────────────────────────────
type PlatformId = "instagram" | "tiktok" | "youtube"

type Platform = {
  id: PlatformId
  name: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  gradient: string
  solid: string
  profileUrl: (handle: string) => string
}

const PLATFORMS: Record<PlatformId, Platform> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    Icon: Instagram,
    gradient: "linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)",
    solid: "#DD2A7B",
    profileUrl: (h) => `https://instagram.com/${h.replace(/^@/, "")}`,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    Icon: Music2,
    gradient: "linear-gradient(135deg, #000000 0%, #25F4EE 50%, #FE2C55 100%)",
    solid: "#000000",
    profileUrl: (h) => `https://tiktok.com/@${h.replace(/^@/, "")}`,
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    Icon: Play,
    gradient: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)",
    solid: "#FF0000",
    profileUrl: (h) => `https://youtube.com/@${h.replace(/^@/, "")}`,
  },
}

const PLATFORM_ORDER: PlatformId[] = ["instagram", "tiktok", "youtube"]

// ─── Placeholder data per platform ────────────────────────────────────────────
type IconProps = { className?: string; style?: React.CSSProperties }
type Stat = { label: string; value: string; Icon: React.ComponentType<IconProps> }
type RecentPost = { format: string; title: string; metric: string; metricLabel: string; daysAgo: number }

type PlatformView = {
  stats: Stat[]
  recent: RecentPost[]
  profileStats: { followers: string; engagement: string }
}

const VIEWS: Record<PlatformId, PlatformView> = {
  instagram: {
    profileStats: { followers: "12.4K", engagement: "4.8%" },
    stats: [
      { label: "Followers", value: "12,432", Icon: Users },
      { label: "Avg Reach", value: "8,210", Icon: Eye },
      { label: "Engagement", value: "4.8%", Icon: Percent },
      { label: "Story Views", value: "3,104", Icon: CircleDot },
    ],
    recent: [
      { format: "Reel",     title: "5 hooks that stopped the scroll this week", metric: "2,840", metricLabel: "likes", daysAgo: 1 },
      { format: "Carousel", title: "Behind the scenes of our brand shoot",      metric: "1,612", metricLabel: "likes", daysAgo: 3 },
      { format: "Post",     title: "Monday motivation — what we're working on", metric: "892",   metricLabel: "likes", daysAgo: 4 },
      { format: "Story",    title: "Studio reveal — soft launch",               metric: "4,210", metricLabel: "views", daysAgo: 5 },
      { format: "Reel",     title: "Three tools I can't live without",          metric: "5,124", metricLabel: "likes", daysAgo: 7 },
    ],
  },
  tiktok: {
    profileStats: { followers: "28.1K", engagement: "9.2%" },
    stats: [
      { label: "Followers", value: "28,104", Icon: Users },
      { label: "Total Views", value: "1.2M", Icon: Eye },
      { label: "Likes", value: "184K", Icon: Heart },
      { label: "Avg Watch", value: "12.4s", Icon: Clock },
    ],
    recent: [
      { format: "Video", title: "POV: you finally have a content system", metric: "412K", metricLabel: "views", daysAgo: 1 },
      { format: "Video", title: "Three ways I batch a week of content",   metric: "89K",  metricLabel: "views", daysAgo: 2 },
      { format: "Photo", title: "Studio carousel — the soft palette",     metric: "12K",  metricLabel: "views", daysAgo: 3 },
      { format: "Video", title: "What no one tells you about going viral", metric: "210K", metricLabel: "views", daysAgo: 5 },
      { format: "Video", title: "Get ready with me — content day",         metric: "44K",  metricLabel: "views", daysAgo: 6 },
    ],
  },
  youtube: {
    profileStats: { followers: "4.6K", engagement: "6.1%" },
    stats: [
      { label: "Subscribers", value: "4,612", Icon: Users },
      { label: "Total Views", value: "284K", Icon: Eye },
      { label: "Watch Hours", value: "9.2K", Icon: Clock },
      { label: "CTR", value: "6.1%", Icon: MousePointerClick },
    ],
    recent: [
      { format: "Long",  title: "How I plan a month of content in 2 hours",   metric: "18.4K", metricLabel: "views", daysAgo: 2 },
      { format: "Short", title: "The one hook formula I use every week",      metric: "84K",   metricLabel: "views", daysAgo: 3 },
      { format: "Long",  title: "My honest review of every content app",      metric: "12.1K", metricLabel: "views", daysAgo: 6 },
      { format: "Short", title: "Stop using these tired captions",            metric: "31K",   metricLabel: "views", daysAgo: 8 },
      { format: "Long",  title: "Studio tour + how I edit Reels",             metric: "7.2K",  metricLabel: "views", daysAgo: 11 },
    ],
  },
}

// ─── Format badge colours (subtle, palette-coherent) ──────────────────────────
function formatBadgeStyle(format: string): React.CSSProperties {
  const f = format.toLowerCase()
  if (f.includes("reel") || f.includes("short") || f.includes("video")) {
    return { backgroundColor: "#F4E4D9", color: "#A04518" }
  }
  if (f.includes("carousel")) {
    return { backgroundColor: "#E8E0F2", color: "#5340A0" }
  }
  if (f.includes("story")) {
    return { backgroundColor: "#FDE5DC", color: "#C25627" }
  }
  if (f.includes("photo")) {
    return { backgroundColor: "#E4EFE5", color: "#3D6B43" }
  }
  if (f.includes("long")) {
    return { backgroundColor: "#FDE5E5", color: "#A02828" }
  }
  return { backgroundColor: "#EFE7DA", color: "#6A5D52" }
}

function formatIcon(format: string) {
  const f = format.toLowerCase()
  if (f.includes("reel") || f.includes("short") || f.includes("video") || f.includes("long")) return Film
  if (f.includes("carousel")) return LayoutGrid
  if (f.includes("photo") || f.includes("post")) return ImageIcon
  if (f.includes("story")) return CircleDot
  return ImageIcon
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgoLabel(n: number) {
  if (n === 0) return "Today"
  if (n === 1) return "Yesterday"
  if (n < 7) return `${n}d ago`
  if (n < 30) return `${Math.floor(n / 7)}w ago`
  return `${Math.floor(n / 30)}mo ago`
}

function formatScheduledDate(iso: string): { day: string; month: string; full: string } {
  const d = new Date(iso)
  const day = d.toLocaleDateString(undefined, { day: "numeric" })
  const month = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
  const full = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  return { day, month, full }
}

function getInitials(handle: string | undefined, fallback: string) {
  if (!handle) return fallback.slice(0, 2).toUpperCase()
  return handle.replace(/^@/, "").slice(0, 2).toUpperCase()
}

// ─── Workspace stat card (top strip) ──────────────────────────────────────────
function WorkspaceStat({
  label,
  value,
  href,
}: {
  label: string
  value: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-baseline justify-between gap-3 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: C.surface,
        boxShadow: "0 1px 0 rgba(45,45,45,0.04), 0 8px 24px rgba(45,45,45,0.05)",
      }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.concrete }}>
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: C.graphite }}>
        {value}
      </span>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PlatformDashboard({
  firstName,
  socialAccounts,
  upcomingIdeas,
  counts,
  brandName,
}: {
  firstName: string
  socialAccounts: Record<string, string>
  upcomingIdeas: Pick<Idea, "id" | "title" | "format" | "scheduled_date" | "status">[]
  counts: { scheduled: number; ideas: number; pillars: number }
  brandName: string | null
}) {
  const [active, setActive] = useState<PlatformId>("instagram")
  const platform = PLATFORMS[active]
  const view = VIEWS[active]
  const handle = socialAccounts[active]
  const isConnected = !!handle

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: C.bg }}>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        className="px-4 pt-6 pb-5 md:px-10 md:pt-9 md:pb-7"
        style={{ borderBottom: `1px solid ${C.hairline}` }}
      >
        <div className="max-w-6xl mx-auto w-full">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-2"
            style={{ color: C.brick }}
          >
            Dashboard
          </p>
          <h1
            className="text-2xl md:text-4xl font-semibold leading-tight"
            style={{ color: C.graphite, fontFamily: '"Instrument Serif", "Cormorant Garamond", Georgia, serif' }}
          >
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: C.ink }}>
            {brandName ? <>Here&apos;s how <span style={{ color: C.graphite, fontWeight: 500 }}>{brandName}</span> is performing across platforms.</> : "Connect a brand to start tracking platform performance."}
          </p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:px-10 md:py-10 space-y-8">

        {/* ── Workspace strip ────────────────────────────────────────── */}
        <section className="grid grid-cols-3 gap-3 md:gap-4">
          <WorkspaceStat label="Posts scheduled" value={counts.scheduled} href="/content-planner" />
          <WorkspaceStat label="Ideas saved" value={counts.ideas} href="/content-planner" />
          <WorkspaceStat label="Pillars active" value={counts.pillars} href="/content-pillars" />
        </section>

        {/* ── Platform switcher ──────────────────────────────────────── */}
        <section>
          <div
            className="inline-flex p-1 rounded-2xl gap-1 w-full md:w-auto"
            style={{ backgroundColor: C.surface, boxShadow: "0 1px 0 rgba(45,45,45,0.04)" }}
            role="tablist"
            aria-label="Platform"
          >
            {PLATFORM_ORDER.map((id) => {
              const p = PLATFORMS[id]
              const isActive = active === id
              const PIcon = p.Icon
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(id)}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 md:px-5 h-10 rounded-xl text-sm font-medium transition-all"
                  style={
                    isActive
                      ? { background: p.gradient, color: "#FFFFFF", boxShadow: "0 4px 14px rgba(45,45,45,0.18)" }
                      : { color: C.ink, backgroundColor: "transparent" }
                  }
                >
                  <PIcon className="h-4 w-4" />
                  <span>{p.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Profile header ─────────────────────────────────────────── */}
        <section
          className="rounded-3xl p-5 md:p-7 relative overflow-hidden"
          style={{
            backgroundColor: C.surface,
            boxShadow: "0 1px 0 rgba(45,45,45,0.04), 0 12px 36px rgba(45,45,45,0.06)",
          }}
        >
          {/* Accent strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: platform.gradient }}
          />

          <div className="flex flex-col md:flex-row md:items-center gap-5 mt-1">
            {/* Profile pic */}
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl font-semibold shrink-0 shadow-lg"
              style={{ background: platform.gradient }}
              aria-hidden
            >
              {getInitials(handle, brandName ?? firstName)}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-xl md:text-2xl font-semibold truncate"
                  style={{ color: C.graphite }}
                >
                  {handle ? `@${handle.replace(/^@/, "")}` : "Not connected"}
                </h2>
                {isConnected ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: "#E4EFE5", color: "#3D6B43" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#3D6B43" }} />
                    Connected
                  </span>
                ) : (
                  <Link
                    href="/settings"
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: C.surfaceAlt, color: C.brick }}
                  >
                    Connect →
                  </Link>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: C.ink }}>
                {platform.name}
                {brandName ? <> · <span style={{ color: C.concrete }}>{brandName}</span></> : null}
              </p>

              {/* Quick stats inline */}
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-lg md:text-xl font-semibold tabular-nums" style={{ color: C.graphite }}>
                    {view.profileStats.followers}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.concrete }}>
                    {active === "youtube" ? "Subscribers" : "Followers"}
                  </p>
                </div>
                <div className="border-l pl-6" style={{ borderColor: C.hairline }}>
                  <p className="text-lg md:text-xl font-semibold tabular-nums" style={{ color: C.graphite }}>
                    {view.profileStats.engagement}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: C.concrete }}>
                    Engagement
                  </p>
                </div>
              </div>
            </div>

            {/* External link */}
            {isConnected && (
              <a
                href={platform.profileUrl(handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-medium transition-colors"
                style={{
                  border: `1px solid ${C.hairline}`,
                  color: C.ink,
                  backgroundColor: C.surface,
                }}
              >
                View profile <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </section>

        {/* ── Key metrics row ────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {view.stats.map((s) => {
            const Icon = s.Icon
            return (
              <div
                key={s.label}
                className="rounded-2xl p-4 md:p-5"
                style={{
                  backgroundColor: C.surface,
                  boxShadow: "0 1px 0 rgba(45,45,45,0.04), 0 8px 20px rgba(45,45,45,0.04)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
                    style={{ backgroundColor: C.surfaceAlt }}
                  >
                    <Icon className="h-4 w-4" style={{ color: C.brick } as React.CSSProperties} />
                  </span>
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: C.concrete }} />
                </div>
                <p className="text-2xl md:text-[28px] font-semibold leading-none tabular-nums" style={{ color: C.graphite }}>
                  {s.value}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: C.concrete }}>
                  {s.label}
                </p>
              </div>
            )
          })}
        </section>

        {/* ── Two-column: Recent posts + Upcoming scheduled ──────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Recent posts */}
          <div
            className="lg:col-span-3 rounded-3xl p-5 md:p-6"
            style={{
              backgroundColor: C.surface,
              boxShadow: "0 1px 0 rgba(45,45,45,0.04), 0 12px 32px rgba(45,45,45,0.05)",
            }}
          >
            <div className="flex items-end justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold" style={{ color: C.graphite }}>
                  Recent content
                </h3>
                <p className="text-xs mt-0.5" style={{ color: C.concrete }}>
                  Last 5 posts on {platform.name}
                </p>
              </div>
              <span className="text-[11px] font-medium" style={{ color: C.concrete }}>
                Sample data
              </span>
            </div>

            <ul className="space-y-1">
              {view.recent.map((post, i) => {
                const FIcon = formatIcon(post.format)
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 py-3"
                    style={{
                      borderTop: i === 0 ? "none" : `1px solid ${C.hairline}`,
                    }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl shrink-0 inline-flex items-center justify-center"
                      style={formatBadgeStyle(post.format)}
                    >
                      <FIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: C.graphite }}>
                        {post.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                          style={formatBadgeStyle(post.format)}
                        >
                          {post.format}
                        </span>
                        <span className="text-[11px]" style={{ color: C.concrete }}>
                          {daysAgoLabel(post.daysAgo)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums" style={{ color: C.graphite }}>
                        {post.metric}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: C.concrete }}>
                        {post.metricLabel}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Upcoming scheduled */}
          <div
            className="lg:col-span-2 rounded-3xl p-5 md:p-6"
            style={{
              backgroundColor: C.surface,
              boxShadow: "0 1px 0 rgba(45,45,45,0.04), 0 12px 32px rgba(45,45,45,0.05)",
            }}
          >
            <div className="flex items-end justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold" style={{ color: C.graphite }}>
                  Up next
                </h3>
                <p className="text-xs mt-0.5" style={{ color: C.concrete }}>
                  Your scheduled posts
                </p>
              </div>
              <Link
                href="/content-planner"
                className="text-[11px] font-semibold hover:underline"
                style={{ color: C.brick }}
              >
                Calendar →
              </Link>
            </div>

            {upcomingIdeas.length === 0 ? (
              <div
                className="rounded-2xl border-2 border-dashed p-6 text-center"
                style={{ borderColor: C.hairline, backgroundColor: C.surfaceAlt }}
              >
                <CalendarDays className="h-5 w-5 mx-auto mb-2" style={{ color: C.concrete }} />
                <p className="text-sm font-medium" style={{ color: C.graphite }}>
                  Nothing scheduled
                </p>
                <p className="text-xs mt-1" style={{ color: C.concrete }}>
                  Schedule an idea from Content Planner to see it here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcomingIdeas.map((idea) => {
                  const FIcon = formatIcon(idea.format)
                  const { day, month, full } = idea.scheduled_date
                    ? formatScheduledDate(idea.scheduled_date)
                    : { day: "—", month: "—", full: "Unscheduled" }
                  return (
                    <li
                      key={idea.id}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ backgroundColor: C.surfaceAlt }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shrink-0 flex flex-col items-center justify-center"
                        style={{ backgroundColor: C.surface }}
                      >
                        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: C.brick }}>
                          {month}
                        </span>
                        <span className="text-base font-semibold leading-none tabular-nums" style={{ color: C.graphite }}>
                          {day}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: C.graphite }}>
                          {idea.title || "Untitled idea"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                            style={formatBadgeStyle(idea.format)}
                          >
                            <FIcon className="h-2.5 w-2.5" />
                            {idea.format}
                          </span>
                          <span className="text-[10px]" style={{ color: C.concrete }}>
                            {full}
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── Quick actions ──────────────────────────────────────────── */}
        <section
          className="rounded-3xl p-5 md:p-6"
          style={{
            background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surfaceAlt} 100%)`,
            border: `1px solid ${C.hairline}`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold" style={{ color: C.graphite }}>
                Quick actions
              </h3>
              <p className="text-xs mt-0.5" style={{ color: C.ink }}>
                Jump into your next move.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <QuickActionButton href="/content-creator" icon={PenLine} label="Create post" primary />
              <QuickActionButton href="/content-planner" icon={CalendarDays} label="Calendar" />
              <QuickActionButton href="/content-creator" icon={Sparkles} label="Add idea" />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function QuickActionButton({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string
  icon: React.ComponentType<IconProps>
  label: string
  primary?: boolean
}) {
  if (primary) {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: C.brick, color: "#FFFFFF" }}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.split(" ")[0]}</span>
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-colors"
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.hairline}`,
        color: C.graphite,
      }}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(" ")[0]}</span>
    </Link>
  )
}
