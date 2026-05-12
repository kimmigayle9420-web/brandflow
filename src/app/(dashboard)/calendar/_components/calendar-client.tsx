"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  ChevronLeft, ChevronRight, Sparkles, FileText, LayoutGrid, Film,
  Image as ImageIcon, Inbox, X, Clock,
} from "lucide-react"
import {
  startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, format,
  isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, addMonths, subMonths, isToday, startOfDay,
} from "date-fns"
import type { Brand, ContentPillar, Idea, PostPlatform } from "@/types"

// ── No Filter palette ─────────────────────────────────────────────────────
const CREAM = "#EDE6DC"
const BRICK = "#E06A33"
const GRAPHITE = "#2D2D2D"
const CONCRETE = "#C2B5A3"
const PAPER = "#FAF6EF"
const INK_MUTED = "#6B5E51"

// ── Time grid ─────────────────────────────────────────────────────────────
const START_HOUR = 6
const END_HOUR = 22
const HOUR_PX = 60
const SLOT_PX = HOUR_PX / 4 // 15-min slot
const HOURS: number[] = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_PX

// ── Best-time bands (placeholder analytics) ───────────────────────────────
// dows uses date-fns getDay: 0=Sun, 1=Mon … 6=Sat
const BEST_TIMES: Array<{ dows: number[]; start: number; end: number }> = [
  { dows: [1, 2, 3, 4, 5], start: 11, end: 13 }, // weekday lunch
  { dows: [0, 1, 2, 3, 4, 5, 6], start: 19, end: 21 }, // evening primetime
]

// ── Platform colours ──────────────────────────────────────────────────────
const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#111111",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  youtube: "#FF0000",
  pinterest: "#E60023",
  other: CONCRETE,
}

// ── Format helpers ────────────────────────────────────────────────────────
const FORMAT_META: Record<string, { label: string; bg: string; fg: string; Icon: typeof FileText }> = {
  post: { label: "Post", bg: "#F0F4EA", fg: "#3F6B2C", Icon: FileText },
  carousel: { label: "Carousel", bg: "#EAF1F8", fg: "#1F4F84", Icon: LayoutGrid },
  reel: { label: "Reel", bg: "#FBE7DC", fg: "#A4471F", Icon: Film },
  story: { label: "Story", bg: "#F1E8F8", fg: "#5D2E80", Icon: ImageIcon },
}

// ── Idea scheduling helpers ───────────────────────────────────────────────
function ideaInstant(idea: Idea): Date | null {
  if (idea.scheduled_at) return parseISO(idea.scheduled_at)
  if (idea.scheduled_date) {
    // No time → default to 10:00 (placeholder until time-of-day is set)
    const d = parseISO(idea.scheduled_date)
    d.setHours(10, 0, 0, 0)
    return d
  }
  return null
}

function minutesFromGridTop(d: Date): number {
  const minutesIntoDay = d.getHours() * 60 + d.getMinutes()
  return minutesIntoDay - START_HOUR * 60
}

function chipTopPx(d: Date): number {
  const m = minutesFromGridTop(d)
  return Math.max(0, Math.min(TOTAL_HEIGHT - SLOT_PX, (m / 60) * HOUR_PX))
}

function chipHeightPx(idea: Idea): number {
  // Reels & carousels read as longer commitments — show a slightly taller chip.
  const f = idea.format
  if (f === "reel") return SLOT_PX * 3 // 45m
  if (f === "carousel") return SLOT_PX * 2 // 30m
  return SLOT_PX * 2 // 30m
}

// ── Week range label ──────────────────────────────────────────────────────
function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${format(weekStart, "d")}–${format(end, "d MMMM yyyy")}`
  }
  if (weekStart.getFullYear() === end.getFullYear()) {
    return `${format(weekStart, "d MMM")} – ${format(end, "d MMM yyyy")}`
  }
  return `${format(weekStart, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`
}

// ── Sub-components ────────────────────────────────────────────────────────

function PostChip({
  idea,
  top,
  height,
  onClick,
}: {
  idea: Idea
  top: number
  height: number
  onClick: () => void
}) {
  const fmt = FORMAT_META[idea.format] ?? FORMAT_META.post
  const platform = (idea.platform ?? "instagram") as PostPlatform
  const dot = PLATFORM_COLOR[platform] ?? PLATFORM_COLOR.other
  const title = idea.hook ?? idea.title ?? "Untitled"

  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        // Placeholder drag — set data for future drop targets.
        e.dataTransfer.setData("text/plain", idea.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      className="absolute left-1 right-1 z-20 rounded-lg text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing overflow-hidden"
      style={{
        top,
        height,
        backgroundColor: "white",
        border: `1px solid ${CONCRETE}66`,
        borderLeft: `3px solid ${dot}`,
        boxShadow: "0 1px 2px rgba(45,45,45,0.06)",
      }}
      title={title}
    >
      <div className="flex items-center gap-1.5 px-2 pt-1.5">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: fmt.bg, color: fmt.fg }}
        >
          <fmt.Icon className="h-2.5 w-2.5" />
          {fmt.label}
        </span>
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      </div>
      <p
        className="px-2 pb-1 pt-0.5 text-[11px] font-medium leading-tight line-clamp-2"
        style={{ color: GRAPHITE }}
      >
        {title}
      </p>
    </button>
  )
}

function DetailPopover({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const fmt = FORMAT_META[idea.format] ?? FORMAT_META.post
  const platform = (idea.platform ?? "instagram") as PostPlatform
  const dot = PLATFORM_COLOR[platform] ?? PLATFORM_COLOR.other
  const when = ideaInstant(idea)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(45,45,45,0.32)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: PAPER, border: `1px solid ${CONCRETE}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
              style={{ backgroundColor: fmt.bg, color: fmt.fg }}
            >
              <fmt.Icon className="h-3 w-3" />
              {fmt.label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize" style={{ color: INK_MUTED }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
              {platform}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-[#EDE6DC]"
            style={{ color: INK_MUTED }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <h3 className="text-base font-semibold leading-snug" style={{ color: GRAPHITE }}>
            {idea.hook ?? idea.title ?? "Untitled"}
          </h3>
          {when && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: INK_MUTED }}>
              <Clock className="h-3.5 w-3.5" />
              {format(when, "EEEE d MMM yyyy · HH:mm")}
            </div>
          )}
          {idea.caption && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-6" style={{ color: GRAPHITE }}>
              {idea.caption}
            </p>
          )}
          {idea.hashtags && (
            <p className="text-xs font-mono leading-relaxed" style={{ color: INK_MUTED }}>
              {idea.hashtags}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: "month" | "week" | "agenda"
  onChange: (v: "month" | "week" | "agenda") => void
}) {
  const opts: Array<{ key: "month" | "week" | "agenda"; label: string }> = [
    { key: "month", label: "Month" },
    { key: "week", label: "Week" },
    { key: "agenda", label: "Agenda" },
  ]
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{ backgroundColor: PAPER, border: `1px solid ${CONCRETE}66` }}
    >
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{
            backgroundColor: view === o.key ? BRICK : "transparent",
            color: view === o.key ? "white" : INK_MUTED,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function MiniMonth({
  month,
  weekStart,
  densityByDay,
  onPick,
  onPrev,
  onNext,
}: {
  month: Date
  weekStart: Date
  densityByDay: Map<string, number>
  onPick: (d: Date) => void
  onPrev: () => void
  onNext: () => void
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const activeWeekEnd = addDays(startOfDay(weekStart), 6)

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: PAPER, border: `1px solid ${CONCRETE}66` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: GRAPHITE }}>
          {format(month, "MMMM yyyy")}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={onPrev} className="p-1 rounded-md transition-colors hover:bg-[#EDE6DC]">
            <ChevronLeft className="h-3.5 w-3.5" style={{ color: INK_MUTED }} />
          </button>
          <button onClick={onNext} className="p-1 rounded-md transition-colors hover:bg-[#EDE6DC]">
            <ChevronRight className="h-3.5 w-3.5" style={{ color: INK_MUTED }} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-center" style={{ color: INK_MUTED }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dim = !isSameMonth(day, month)
          const isInActiveWeek = day >= startOfDay(weekStart) && day <= activeWeekEnd
          const today = isToday(day)
          const count = densityByDay.get(format(day, "yyyy-MM-dd")) ?? 0
          return (
            <button
              key={day.toISOString()}
              onClick={() => onPick(day)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center transition-colors text-[11px]"
              style={{
                backgroundColor: isInActiveWeek ? `${BRICK}1A` : "transparent",
                color: dim ? CONCRETE : today ? BRICK : GRAPHITE,
                fontWeight: today ? 700 : 500,
              }}
            >
              <span>{format(day, "d")}</span>
              {count > 0 && (
                <span
                  className="mt-0.5 h-1 w-1 rounded-full"
                  style={{ backgroundColor: dim ? CONCRETE : BRICK }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function UnscheduledPool({
  ideas,
  onClickIdea,
  onAutoSchedule,
}: {
  ideas: Idea[]
  onClickIdea: (i: Idea) => void
  onAutoSchedule: () => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: PAPER, border: `1px solid ${CONCRETE}66` }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${CONCRETE}44` }}>
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4" style={{ color: BRICK }} />
          <span className="text-sm font-semibold" style={{ color: GRAPHITE }}>
            Unscheduled
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${BRICK}1A`, color: BRICK }}>
            {ideas.length}
          </span>
        </div>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-2 space-y-1.5">
        {ideas.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs" style={{ color: INK_MUTED }}>No unscheduled ideas</p>
            <p className="text-[11px] mt-1" style={{ color: CONCRETE }}>
              New ideas without a scheduled date land here.
            </p>
          </div>
        ) : (
          ideas.map((idea) => {
            const fmt = FORMAT_META[idea.format] ?? FORMAT_META.post
            const platform = (idea.platform ?? "instagram") as PostPlatform
            const dot = PLATFORM_COLOR[platform] ?? PLATFORM_COLOR.other
            return (
              <button
                key={idea.id}
                onClick={() => onClickIdea(idea)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", idea.id)
                  e.dataTransfer.effectAllowed = "move"
                }}
                className="w-full text-left rounded-xl p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-grab active:cursor-grabbing"
                style={{
                  backgroundColor: "white",
                  border: `1px solid ${CONCRETE}66`,
                  borderLeft: `3px solid ${dot}`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: fmt.bg, color: fmt.fg }}
                  >
                    <fmt.Icon className="h-2.5 w-2.5" />
                    {fmt.label}
                  </span>
                </div>
                <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: GRAPHITE }}>
                  {idea.hook ?? idea.title ?? "Untitled"}
                </p>
              </button>
            )
          })
        )}
      </div>
      <div className="p-2" style={{ borderTop: `1px solid ${CONCRETE}44` }}>
        <button
          onClick={onAutoSchedule}
          disabled={ideas.length === 0}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          style={{ backgroundColor: BRICK, color: "white" }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto-schedule
        </button>
      </div>
    </div>
  )
}

function ComingSoon({ view }: { view: "month" | "agenda" }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{ backgroundColor: PAPER, border: `1px dashed ${CONCRETE}` }}
    >
      <p className="text-base font-semibold mb-1" style={{ color: GRAPHITE }}>
        {view === "month" ? "Month view" : "Agenda view"} — coming soon
      </p>
      <p className="text-sm" style={{ color: INK_MUTED }}>
        For now, stay on the Week view to see your schedule, best-time bands, and the now-line.
      </p>
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────

export function CalendarClient({
  brand,
  pillars,
  scheduledIdeas,
  unscheduledIdeas,
}: {
  brand: Brand | null
  pillars: ContentPillar[]
  scheduledIdeas: Idea[]
  unscheduledIdeas: Idea[]
}) {
  void pillars // reserved for upcoming pillar-tint chip variant

  const [today, setToday] = useState<Date>(() => new Date())
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [miniMonth, setMiniMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [view, setView] = useState<"month" | "week" | "agenda">("week")
  const [selected, setSelected] = useState<Idea | null>(null)
  const [nowMinute, setNowMinute] = useState(() => new Date())

  // Tick the now-line every minute.
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNowMinute(n)
      setToday(n)
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const chipsByDay = useMemo(() => {
    const map = new Map<string, Array<{ idea: Idea; top: number; height: number }>>()
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []))
    scheduledIdeas.forEach((idea) => {
      const d = ideaInstant(idea)
      if (!d) return
      const key = format(d, "yyyy-MM-dd")
      const bucket = map.get(key)
      if (!bucket) return
      bucket.push({ idea, top: chipTopPx(d), height: chipHeightPx(idea) })
    })
    return map
  }, [days, scheduledIdeas])

  const densityByDay = useMemo(() => {
    const m = new Map<string, number>()
    scheduledIdeas.forEach((idea) => {
      const d = ideaInstant(idea)
      if (!d) return
      const key = format(d, "yyyy-MM-dd")
      m.set(key, (m.get(key) ?? 0) + 1)
    })
    return m
  }, [scheduledIdeas])

  const nowLineY = useMemo(() => {
    const m = nowMinute.getHours() * 60 + nowMinute.getMinutes() - START_HOUR * 60
    if (m < 0 || m > (END_HOUR - START_HOUR) * 60) return null
    return (m / 60) * HOUR_PX
  }, [nowMinute])

  const goPrev = useCallback(() => setWeekStart((w) => subWeeks(w, 1)), [])
  const goNext = useCallback(() => setWeekStart((w) => addWeeks(w, 1)), [])
  const goToday = useCallback(() => {
    const w = startOfWeek(new Date(), { weekStartsOn: 1 })
    setWeekStart(w)
    setMiniMonth(startOfMonth(new Date()))
  }, [])

  const pickFromMini = useCallback((d: Date) => {
    setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))
  }, [])

  // ── No brand ────────────────────────────────────────────────────────────
  if (!brand) {
    return (
      <div
        className="rounded-2xl border border-dashed p-12 text-center"
        style={{ borderColor: CONCRETE }}
      >
        <p className="text-base font-medium" style={{ color: GRAPHITE }}>
          No brand set up yet
        </p>
        <p className="text-sm mt-1 mb-4" style={{ color: INK_MUTED }}>
          Create a brand first to start scheduling content.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: BRICK }}
        >
          Set up your brand →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: GRAPHITE }}>
            {weekRangeLabel(weekStart)}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex rounded-xl overflow-hidden"
            style={{ backgroundColor: PAPER, border: `1px solid ${CONCRETE}66` }}
          >
            <button
              onClick={goPrev}
              className="px-2.5 py-1.5 transition-colors hover:bg-[#EDE6DC]"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" style={{ color: INK_MUTED }} />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-semibold border-x transition-colors hover:bg-[#EDE6DC]"
              style={{ borderColor: `${CONCRETE}66`, color: GRAPHITE }}
            >
              Today
            </button>
            <button
              onClick={goNext}
              className="px-2.5 py-1.5 transition-colors hover:bg-[#EDE6DC]"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" style={{ color: INK_MUTED }} />
            </button>
          </div>
          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        <div className="lg:col-span-3">
          {view === "week" ? (
            <WeekGrid
              days={days}
              chipsByDay={chipsByDay}
              nowLineY={nowLineY}
              today={today}
              onSelect={setSelected}
            />
          ) : (
            <ComingSoon view={view} />
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <MiniMonth
            month={miniMonth}
            weekStart={weekStart}
            densityByDay={densityByDay}
            onPick={pickFromMini}
            onPrev={() => setMiniMonth((m) => subMonths(m, 1))}
            onNext={() => setMiniMonth((m) => addMonths(m, 1))}
          />
          <UnscheduledPool
            ideas={unscheduledIdeas}
            onClickIdea={setSelected}
            onAutoSchedule={() => {
              // UI stub — wiring to /api/auto-schedule would go here.
            }}
          />
        </div>
      </div>

      {selected && <DetailPopover idea={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ── Week grid ─────────────────────────────────────────────────────────────

function WeekGrid({
  days,
  chipsByDay,
  nowLineY,
  today,
  onSelect,
}: {
  days: Date[]
  chipsByDay: Map<string, Array<{ idea: Idea; top: number; height: number }>>
  nowLineY: number | null
  today: Date
  onSelect: (i: Idea) => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: PAPER, border: `1px solid ${CONCRETE}66` }}
    >
      {/* Day headers */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))`,
          borderBottom: `1px solid ${CONCRETE}44`,
        }}
      >
        <div />
        {days.map((d) => {
          const today_ = isToday(d)
          return (
            <div
              key={d.toISOString()}
              className="px-2 py-3 text-center"
              style={{
                borderLeft: `1px solid ${CONCRETE}33`,
                backgroundColor: today_ ? `${BRICK}0F` : "transparent",
              }}
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: today_ ? BRICK : INK_MUTED }}
              >
                {format(d, "EEE")}
              </div>
              <div
                className="mt-0.5 text-base font-semibold"
                style={{ color: today_ ? BRICK : GRAPHITE }}
              >
                {format(d, "d")}
              </div>
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div className="overflow-x-auto">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))`,
            height: TOTAL_HEIGHT,
            minWidth: 720,
          }}
        >
          {/* Hour gutter */}
          <div className="relative" style={{ borderRight: `1px solid ${CONCRETE}44` }}>
            {HOURS.slice(0, -1).map((h) => (
              <div
                key={h}
                className="relative"
                style={{
                  height: HOUR_PX,
                  borderTop: `1px solid ${CONCRETE}22`,
                }}
              >
                <span
                  className="absolute -top-2 right-2 text-[10px] font-medium"
                  style={{ color: INK_MUTED, backgroundColor: PAPER, padding: "0 4px" }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dow = getDay(day)
            const bands = BEST_TIMES.filter((b) => b.dows.includes(dow))
            const isToday_ = isSameDay(day, today)
            const key = format(day, "yyyy-MM-dd")
            const chips = chipsByDay.get(key) ?? []
            return (
              <div
                key={day.toISOString()}
                className="relative"
                style={{
                  borderLeft: `1px solid ${CONCRETE}33`,
                  backgroundColor: isToday_ ? `${BRICK}08` : "transparent",
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  // Drop-to-reschedule is a UI stub — wiring goes here.
                }}
              >
                {/* Hour grid lines */}
                {HOURS.slice(0, -1).map((h) => (
                  <div
                    key={h}
                    style={{
                      height: HOUR_PX,
                      borderTop: `1px solid ${CONCRETE}22`,
                    }}
                  />
                ))}

                {/* Best-time bands */}
                {bands.map((b, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      top: (b.start - START_HOUR) * HOUR_PX,
                      height: (b.end - b.start) * HOUR_PX,
                      background: `repeating-linear-gradient(135deg, ${BRICK}14 0 8px, transparent 8px 16px)`,
                    }}
                  >
                    <span
                      className="absolute top-1 left-1 text-[9px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded"
                      style={{ backgroundColor: `${BRICK}1F`, color: BRICK }}
                    >
                      Best
                    </span>
                  </div>
                ))}

                {/* Now-line */}
                {isToday_ && nowLineY !== null && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: nowLineY }}
                  >
                    <div className="relative" style={{ height: 2, backgroundColor: BRICK }}>
                      <div
                        className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full"
                        style={{ backgroundColor: BRICK }}
                      />
                    </div>
                  </div>
                )}

                {/* Chips */}
                {chips.map(({ idea, top, height }) => (
                  <PostChip
                    key={idea.id}
                    idea={idea}
                    top={top}
                    height={height}
                    onClick={() => onSelect(idea)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
