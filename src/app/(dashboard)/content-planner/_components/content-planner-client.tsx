"use client"

import { useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles, Loader2, Trash2, ChevronDown, ChevronUp,
  ExternalLink, Check, LayoutGrid, Film, FileText,
  RefreshCw, Layers,
} from "lucide-react"
import type { Brand, ContentPillar, Idea } from "@/types"
import { useRouter } from "next/navigation"

// ── Types ─────────────────────────────────────────────────────────────────────

type WeekSlotStatus = "empty" | "ai" | "pinned" | "posted"

interface WeekSlot {
  day: string
  dayLabel: string
  pillarId: string | null
  pillarName: string | null
  pillarColor: string | null
  hook: string | null
  angle: string | null
  format: "Post" | "Carousel" | "Reel" | null
  ideaId: string | null
  status: WeekSlotStatus
}

interface WeekIdeaResult {
  pillar_id: string
  day: string
  suggestedHook: string
  suggestedAngle: string
  suggestedFormat: "Post" | "Carousel" | "Reel"
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
  { key: "Sun", label: "Sunday" },
]

const PILLAR_COLORS = [
  "#FECACA", "#BBF7D0", "#FDE68A", "#DDD6FE", "#FDBA74", "#FBCFE8",
]

function emptyWeek(): WeekSlot[] {
  return DAYS.map(({ key, label }) => ({
    day: key,
    dayLabel: label,
    pillarId: null,
    pillarName: null,
    pillarColor: null,
    hook: null,
    angle: null,
    format: null,
    ideaId: null,
    status: "empty",
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormatBadge({ format }: { format: "Post" | "Carousel" | "Reel" | null }) {
  if (!format) return null
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    Post: { bg: "#F0FDF4", text: "#16A34A", icon: <FileText className="h-3 w-3" /> },
    Carousel: { bg: "#EFF6FF", text: "#2563EB", icon: <LayoutGrid className="h-3 w-3" /> },
    Reel: { bg: "#FFF7ED", text: "#C2410C", icon: <Film className="h-3 w-3" /> },
  }
  const s = styles[format] ?? styles.Post
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}>
      {s.icon}
      {format}
    </span>
  )
}

// ── Pillar rotation bar ───────────────────────────────────────────────────────

function PillarRotationBar({ slots, pillars }: { slots: WeekSlot[]; pillars: ContentPillar[] }) {
  const counts: Record<string, number> = {}
  slots.forEach(s => {
    if (s.pillarId) counts[s.pillarId] = (counts[s.pillarId] ?? 0) + 1
  })
  const total = slots.filter(s => s.pillarId).length
  if (total === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A5C50" }}>Pillar rotation this week</p>
      <div className="flex rounded-full overflow-hidden h-2.5">
        {pillars.map((p, i) => {
          const count = counts[p.id] ?? 0
          if (count === 0) return null
          return (
            <div key={p.id}
              style={{ width: `${(count / total) * 100}%`, backgroundColor: PILLAR_COLORS[i % PILLAR_COLORS.length] }}
              title={`${p.name}: ${count} post${count !== 1 ? 's' : ''}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {pillars.map((p, i) => {
          const count = counts[p.id] ?? 0
          if (count === 0) return null
          return (
            <span key={p.id} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#5A3825" }}>
              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />
              {p.name} × {count}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Day Slot Card ─────────────────────────────────────────────────────────────

function DaySlotCard({
  slot,
  pillars,
  pillarIdx,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClear,
  onMarkPosted,
  onOpenInCanva,
  onDevelop,
}: {
  slot: WeekSlot
  pillars: ContentPillar[]
  pillarIdx: number
  isDragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onClear: () => void
  onMarkPosted: () => void
  onOpenInCanva: () => void
  onDevelop: () => void
}) {
  const isEmpty = slot.status === "empty"
  const isPosted = slot.status === "posted"
  const color = slot.pillarColor ?? (pillarIdx >= 0 ? PILLAR_COLORS[pillarIdx % PILLAR_COLORS.length] : "#E5DDD5")

  return (
    <div
      draggable={!isEmpty}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className="rounded-2xl border transition-all duration-200 relative overflow-hidden"
      style={{
        borderColor: isDragOver ? "#F97066" : (isEmpty ? "#E5DDD5" : color),
        backgroundColor: isDragOver ? "#FFF5F4" : (isEmpty ? "white" : `${color}22`),
        borderWidth: isDragOver ? "2px" : "1.5px",
        opacity: isPosted ? 0.6 : 1,
        cursor: isEmpty ? "default" : "grab",
        minHeight: "140px",
      }}
    >
      {/* Left accent bar */}
      {!isEmpty && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: color }} />
      )}

      <div className="p-4 pl-5">
        {/* Day header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#7A5C50" }}>{slot.day}</span>
            {isPosted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#F0FDF4", color: "#16A34A" }}>
                <Check className="h-3 w-3" /> Posted
              </span>
            )}
          </div>
          {!isEmpty && (
            <button onClick={onClear} className="text-xs rounded-lg px-2 py-1 transition-colors hover:bg-red-50"
              style={{ color: "#C4B5A5" }} title="Clear slot">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            {isDragOver ? (
              <p className="text-sm font-medium" style={{ color: "#F97066" }}>Drop here</p>
            ) : (
              <>
                <p className="text-xs" style={{ color: "#C4B5A5" }}>No content planned</p>
                <p className="text-xs mt-0.5" style={{ color: "#D4C4BA" }}>Generate or drag an idea here</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Pillar + format */}
            <div className="flex items-center gap-2 flex-wrap">
              {slot.pillarName && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}44`, color: "#5A3825" }}>
                  {slot.pillarName}
                </span>
              )}
              <FormatBadge format={slot.format} />
            </div>

            {/* Hook */}
            {slot.hook && (
              <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "#2D1810" }}>
                {slot.hook}
              </p>
            )}

            {/* Angle */}
            {slot.angle && (
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#7A5C50" }}>
                {slot.angle}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <button onClick={onDevelop}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: "#F97066", color: "white" }}>
                <ExternalLink className="h-3 w-3" />
                Develop
              </button>
              <button onClick={onOpenInCanva}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", border: "1px solid #DDD6FE" }}>
                ✨ Canva
              </button>
              {!isPosted && (
                <button onClick={onMarkPosted}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
                  <Check className="h-3 w-3" />
                  Posted
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ideas Bank Sidebar ────────────────────────────────────────────────────────

function IdeasBankSidebar({
  ideas,
  pillars,
  loading,
  onRefresh,
  onDragStart,
}: {
  ideas: Idea[]
  pillars: ContentPillar[]
  loading: boolean
  onRefresh: () => void
  onDragStart: (idea: Idea) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  // Group ideas by pillar
  const grouped: Record<string, Idea[]> = { _none: [] }
  pillars.forEach(p => { grouped[p.id] = [] })
  ideas.forEach(idea => {
    const key = idea.pillar_id && grouped[idea.pillar_id] !== undefined ? idea.pillar_id : "_none"
    grouped[key].push(idea)
  })

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#F0EBE5" }}>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: "#F97066" }} />
          <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Ideas Bank</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEF3F2", color: "#F97066" }}>
            {ideas.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" style={{ color: "#7A5C50" }} />
          </button>
          <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            {collapsed ? <ChevronDown className="h-4 w-4" style={{ color: "#7A5C50" }} /> : <ChevronUp className="h-4 w-4" style={{ color: "#7A5C50" }} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#C4B5A5" }} />
            </div>
          ) : ideas.length === 0 ? (
            <div className="py-8 px-5 text-center">
              <p className="text-sm" style={{ color: "#7A5C50" }}>No saved ideas yet</p>
              <p className="text-xs mt-1" style={{ color: "#C4B5A5" }}>Save ideas from the Content Creator</p>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {pillars.map((p, i) => {
                const pillarIdeas = grouped[p.id] ?? []
                if (pillarIdeas.length === 0) return null
                const color = PILLAR_COLORS[i % PILLAR_COLORS.length]
                return (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold" style={{ color: "#5A3825" }}>{p.name}</span>
                    </div>
                    {pillarIdeas.map(idea => (
                      <IdeaBankCard key={idea.id} idea={idea} pillarColor={color} onDragStart={() => onDragStart(idea)} />
                    ))}
                  </div>
                )
              })}
              {(grouped._none?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#E5DDD5" }} />
                    <span className="text-xs font-semibold" style={{ color: "#5A3825" }}>No pillar</span>
                  </div>
                  {grouped._none?.map(idea => (
                    <IdeaBankCard key={idea.id} idea={idea} pillarColor="#E5DDD5" onDragStart={() => onDragStart(idea)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IdeaBankCard({
  idea,
  pillarColor,
  onDragStart,
}: {
  idea: Idea
  pillarColor: string
  onDragStart: () => void
}) {
  const formatIcon = idea.format === "carousel"
    ? <LayoutGrid className="h-3 w-3" />
    : idea.format === "reel"
    ? <Film className="h-3 w-3" />
    : <FileText className="h-3 w-3" />

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm hover:-translate-y-0.5 relative overflow-hidden"
      style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: pillarColor }} />
      <div className="pl-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "#7A5C50" }}>{formatIcon}</span>
          <span className="text-xs capitalize font-medium" style={{ color: "#7A5C50" }}>{idea.format}</span>
        </div>
        <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "#2D1810" }}>
          {idea.hook ?? idea.title ?? "Untitled"}
        </p>
        {idea.title && idea.hook && (
          <p className="text-xs line-clamp-1" style={{ color: "#7A5C50" }}>{idea.title}</p>
        )}
        <p className="text-xs" style={{ color: "#C4B5A5" }}>Drag to a day →</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContentPlannerClient({
  brand,
  pillars,
  initialIdeas,
  userId,
}: {
  brand: Brand | null
  pillars: ContentPillar[]
  initialIdeas: Idea[]
  userId: string
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  const [slots, setSlots] = useState<WeekSlot[]>(emptyWeek())
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas)
  const [generatingWeek, setGeneratingWeek] = useState(false)
  const [ideasLoading, setIdeasLoading] = useState(false)

  // Drag-and-drop state
  const dragDayRef = useRef<string | null>(null)       // dragging from a day slot
  const dragIdeaRef = useRef<Idea | null>(null)        // dragging from ideas bank
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  // ── Ideas refresh ────────────────────────────────────────────────────────
  const fetchIdeas = useCallback(async () => {
    if (!brand) return
    setIdeasLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("ideas") as any)
        .select("*")
        .eq("brand_id", brand.id)
        .in("status", ["idea", "draft"])
        .order("created_at", { ascending: false })
        .limit(50)
      setIdeas((data ?? []) as Idea[])
    } catch { /* silent */ }
    setIdeasLoading(false)
  }, [brand, supabase])

  // ── Pillar lookup ─────────────────────────────────────────────────────────
  const getPillar = (pillarId: string | null) =>
    pillarId ? pillars.find(p => p.id === pillarId) ?? null : null

  const pillarColor = (pillarId: string | null) => {
    const idx = pillars.findIndex(p => p.id === pillarId)
    return idx >= 0 ? PILLAR_COLORS[idx % PILLAR_COLORS.length] : null
  }

  // ── Generate My Week ──────────────────────────────────────────────────────
  const handleGenerateWeek = async () => {
    if (!brand || !pillars.length) {
      toast({ title: "Set up your brand and pillars first", variant: "destructive" })
      return
    }
    setGeneratingWeek(true)
    try {
      const res = await fetch("/api/generate-week-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brand.name,
          niche: brand.niche,
          tone: brand.tone_of_voice ?? undefined,
          targetAudience: brand.target_audience ?? undefined,
          pillars: pillars.map(p => ({
            id: p.id,
            name: p.name,
            voice_direction: p.voice_direction,
            format_preference: p.format_preference,
            weekly_quota: p.weekly_quota,
          })),
        }),
      })
      const data = await res.json() as { weekIdeas?: WeekIdeaResult[]; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed")

      const results: WeekIdeaResult[] = data.weekIdeas ?? []

      setSlots(prev => {
        const updated = [...prev]
        results.forEach((r, i) => {
          if (i >= updated.length) return
          const p = getPillar(r.pillar_id)
          const idx = pillars.findIndex(pl => pl.id === r.pillar_id)
          updated[i] = {
            ...updated[i],
            pillarId: r.pillar_id,
            pillarName: p?.name ?? null,
            pillarColor: idx >= 0 ? PILLAR_COLORS[idx % PILLAR_COLORS.length] : null,
            hook: r.suggestedHook,
            angle: r.suggestedAngle,
            format: r.suggestedFormat,
            ideaId: null,
            status: "ai",
          }
        })
        return updated
      })
      toast({ title: "✨ Week generated! Drag to reorder, or click Develop to build." })
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Check your ANTHROPIC_API_KEY",
        variant: "destructive",
      })
    }
    setGeneratingWeek(false)
  }

  // ── Drag from calendar day ────────────────────────────────────────────────
  const handleDayDragStart = (day: string) => {
    dragDayRef.current = day
    dragIdeaRef.current = null
  }

  // ── Drag from ideas bank ──────────────────────────────────────────────────
  const handleIdeaDragStart = (idea: Idea) => {
    dragIdeaRef.current = idea
    dragDayRef.current = null
  }

  // ── Drop onto a day ───────────────────────────────────────────────────────
  const handleDrop = (targetDay: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDay(null)

    if (dragIdeaRef.current) {
      // Dropping an idea from the bank
      const idea = dragIdeaRef.current
      const p = idea.pillar_id ? pillars.find(pl => pl.id === idea.pillar_id) ?? null : null
      const idx = p ? pillars.findIndex(pl => pl.id === p.id) : -1
      setSlots(prev => prev.map(s =>
        s.day === targetDay ? {
          ...s,
          pillarId: idea.pillar_id,
          pillarName: p?.name ?? null,
          pillarColor: idx >= 0 ? PILLAR_COLORS[idx % PILLAR_COLORS.length] : null,
          hook: idea.hook ?? idea.title ?? null,
          angle: idea.caption?.substring(0, 120) ?? null,
          format: idea.format === "post" ? "Post" : idea.format === "carousel" ? "Carousel" : "Reel",
          ideaId: idea.id,
          status: "pinned",
        } : s
      ))
      dragIdeaRef.current = null
    } else if (dragDayRef.current && dragDayRef.current !== targetDay) {
      // Swapping two day slots
      const fromDay = dragDayRef.current
      setSlots(prev => {
        const fromSlot = prev.find(s => s.day === fromDay)
        const toSlot = prev.find(s => s.day === targetDay)
        if (!fromSlot || !toSlot) return prev
        return prev.map(s => {
          if (s.day === fromDay) return { ...toSlot, day: fromDay, dayLabel: s.dayLabel }
          if (s.day === targetDay) return { ...fromSlot, day: targetDay, dayLabel: toSlot.dayLabel }
          return s
        })
      })
      dragDayRef.current = null
    }
  }

  const handleDragOver = (day: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDay(day)
  }

  const handleDragEnd = () => {
    setDragOverDay(null)
    dragDayRef.current = null
  }

  // ── Slot actions ──────────────────────────────────────────────────────────
  const handleClearSlot = (day: string) => {
    setSlots(prev => prev.map(s =>
      s.day === day ? { ...s, pillarId: null, pillarName: null, pillarColor: null, hook: null, angle: null, format: null, ideaId: null, status: "empty" } : s
    ))
  }

  const handleMarkPosted = (day: string) => {
    setSlots(prev => prev.map(s => s.day === day ? { ...s, status: "posted" } : s))
    toast({ title: "✅ Marked as posted!" })
  }

  const handleOpenInCanva = (slot: WeekSlot) => {
    const text = [slot.hook, slot.angle].filter(Boolean).join("\n\n")
    navigator.clipboard.writeText(text).catch(() => {})
    let url = "https://www.canva.com/create/instagram-posts/"
    if (slot.format === "Carousel") url = "https://www.canva.com/create/instagram-carousel-posts/"
    else if (slot.format === "Reel") url = "https://www.capcut.com"
    window.open(url, "_blank", "noopener")
    toast({ title: "Hook copied to clipboard — paste it into Canva" })
  }

  const handleDevelop = (slot: WeekSlot) => {
    // Navigate to content creator — use URL params to pass context
    const params = new URLSearchParams()
    if (slot.pillarId) params.set("pillar", slot.pillarId)
    if (slot.hook) params.set("topic", slot.hook.substring(0, 100))
    router.push(`/content-creator?${params.toString()}`)
  }

  // ── No brand ──────────────────────────────────────────────────────────────
  if (!brand) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: "#E5DDD5" }}>
        <Layers className="h-10 w-10 mx-auto mb-3" style={{ color: "#C4B5A5" }} />
        <p className="text-base font-medium" style={{ color: "#5A3825" }}>No brand set up yet</p>
        <p className="text-sm mt-1 mb-4" style={{ color: "#7A5C50" }}>Create a brand first to start planning your content week.</p>
        <a href="/brands/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#F97066" }}>
          Create Your Brand
        </a>
      </div>
    )
  }

  const filledCount = slots.filter(s => s.status !== "empty").length

  return (
    <div className="space-y-6">
      {/* ── Header row: Generate My Week button + stats ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "#5A3825" }}>
              {filledCount}/7 days planned
            </span>
            {filledCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#FEF3F2", color: "#F97066" }}>
                {slots.filter(s => s.status === "posted").length} posted
              </span>
            )}
          </div>
          {pillars.length > 0 && <PillarRotationBar slots={slots} pillars={pillars} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSlots(emptyWeek())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5"
            style={{ borderColor: "#E5DDD5", color: "#7A5C50", backgroundColor: "white" }}>
            <RefreshCw className="h-4 w-4" />
            Clear Week
          </button>
          <button
            onClick={handleGenerateWeek}
            disabled={generatingWeek || !pillars.length}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#F97066" }}>
            {generatingWeek
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            {generatingWeek ? "Generating…" : "Generate My Week"}
          </button>
        </div>
      </div>

      {pillars.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "#E5DDD5" }}>
          <p className="text-sm" style={{ color: "#7A5C50" }}>
            Set up your content pillars in the Content Creator first, then come back to plan your week.
          </p>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left: weekly calendar (2/3 width on lg) ── */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 2xl:grid-cols-4">
          {slots.map(slot => {
            const pIdx = pillars.findIndex(p => p.id === slot.pillarId)
            return (
              <DaySlotCard
                key={slot.day}
                slot={slot}
                pillars={pillars}
                pillarIdx={pIdx}
                isDragOver={dragOverDay === slot.day}
                onDragStart={() => handleDayDragStart(slot.day)}
                onDragOver={handleDragOver(slot.day)}
                onDrop={handleDrop(slot.day)}
                onDragEnd={handleDragEnd}
                onClear={() => handleClearSlot(slot.day)}
                onMarkPosted={() => handleMarkPosted(slot.day)}
                onOpenInCanva={() => handleOpenInCanva(slot)}
                onDevelop={() => handleDevelop(slot)}
              />
            )
          })}
        </div>

        {/* ── Right: Ideas Bank sidebar ── */}
        <div className="lg:col-span-1">
          <IdeasBankSidebar
            ideas={ideas}
            pillars={pillars}
            loading={ideasLoading}
            onRefresh={fetchIdeas}
            onDragStart={handleIdeaDragStart}
          />
        </div>
      </div>
    </div>
  )
}
