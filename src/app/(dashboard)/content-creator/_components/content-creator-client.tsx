"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles, Loader2, Plus, X, Calendar, Clock, Upload, Film,
  LayoutGrid, FileText, Zap, Mic2, GraduationCap, Image as ImageIcon,
  Save, Trash2, Copy, Check, Wand2, Instagram, Music2, Youtube,
} from "lucide-react"
import type { Brand, ContentPillar, Idea } from "@/types"

// ─── Format & platform meta ─────────────────────────────────────────────────

type UiFormat = "reel" | "post" | "carousel" | "story" | "voiceover" | "tutorial"
type Platform = "instagram" | "tiktok" | "youtube"
type DbFormat = "post" | "carousel" | "reel"

const FORMATS: Array<{
  key: UiFormat
  label: string
  icon: React.ReactNode
  bg: string
  text: string
  border: string
  dbFormat: DbFormat
}> = [
  { key: "reel",      label: "Reel",      icon: <Film className="h-3.5 w-3.5" />,         bg: "#FEF0EA", text: "#D4432A", border: "#F5C4BC", dbFormat: "reel" },
  { key: "post",      label: "Post",      icon: <FileText className="h-3.5 w-3.5" />,     bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", dbFormat: "post" },
  { key: "carousel",  label: "Carousel",  icon: <LayoutGrid className="h-3.5 w-3.5" />,   bg: "#EEF2FF", text: "#5B6AC4", border: "#C7D2FE", dbFormat: "carousel" },
  { key: "story",     label: "Story",     icon: <Zap className="h-3.5 w-3.5" />,          bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", dbFormat: "post" },
  { key: "voiceover", label: "Voiceover", icon: <Mic2 className="h-3.5 w-3.5" />,         bg: "#FDF2F8", text: "#BE185D", border: "#FBCFE8", dbFormat: "reel" },
  { key: "tutorial",  label: "Tutorial",  icon: <GraduationCap className="h-3.5 w-3.5" />, bg: "#FFFBEB", text: "#B45309", border: "#FCD34D", dbFormat: "carousel" },
]

const PLATFORMS: Array<{
  key: Platform
  label: string
  short: string
  icon: React.ReactNode
}> = [
  { key: "instagram", label: "Instagram",      short: "IG", icon: <Instagram className="h-3.5 w-3.5" /> },
  { key: "tiktok",    label: "TikTok",         short: "TT", icon: <Music2    className="h-3.5 w-3.5" /> },
  { key: "youtube",   label: "YouTube Shorts", short: "YT", icon: <Youtube   className="h-3.5 w-3.5" /> },
]

const PLATFORM_CAPTION_RULES: Record<Platform, string> = {
  instagram: "Instagram: 150–300 words, warm and authentic, end with a clear question CTA that invites comments.",
  tiktok:    "TikTok: 1–3 sentences only, ultra casual, lowercase ok, no formality. Match the trend energy.",
  youtube:   "YouTube Shorts: very short caption, prioritise searchable keywords and a one-line description of the value.",
}

// Best time heuristic per platform (rough industry averages, Sydney TZ-agnostic)
const BEST_TIMES: Record<Platform, { time: string; label: string }> = {
  instagram: { time: "19:00", label: "7:00 PM" },
  tiktok:    { time: "21:00", label: "9:00 PM" },
  youtube:   { time: "17:00", label: "5:00 PM" },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

function formatMeta(f: string) {
  return FORMATS.find((x) => x.key === (f as UiFormat)) ?? FORMATS[1]
}

function getUiFormat(idea: Idea): UiFormat {
  const stored = (idea.script as { ui_format?: string } | null)?.ui_format
  if (stored && FORMATS.some((f) => f.key === stored)) return stored as UiFormat
  return idea.format as UiFormat
}

function getStoredPlatforms(idea: Idea): Platform[] {
  const stored = (idea.script as { platforms?: string[] } | null)?.platforms
  if (Array.isArray(stored)) return stored.filter((p): p is Platform => PLATFORMS.some((x) => x.key === p))
  return []
}

function openCanvaTemplate(format: UiFormat, caption: string, hashtags: string[]) {
  const tagStr = hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
  const text = [caption, tagStr].filter(Boolean).join("\n\n")
  if (text) navigator.clipboard.writeText(text).catch(() => {})
  const canvaUrl =
    format === "reel" || format === "voiceover" ? "https://www.canva.com/create/instagram-reels/"
    : format === "story" ? "https://www.canva.com/create/instagram-stories/"
    : format === "carousel" || format === "tutorial" ? "https://www.canva.com/create/instagram-carousel-posts/"
    : "https://www.canva.com/create/instagram-posts/"
  window.open(canvaUrl, "_blank", "noopener,noreferrer")
}

// ─── Small UI atoms ──────────────────────────────────────────────────────────

function FormatBadge({ format }: { format: UiFormat }) {
  const m = formatMeta(format)
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
      style={{ backgroundColor: m.bg, color: m.text, borderColor: m.border }}
    >
      {m.icon}
      {m.label}
    </span>
  )
}

function PlatformGlyphs({ platforms }: { platforms: Platform[] }) {
  if (platforms.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {platforms.map((p) => {
        const meta = PLATFORMS.find((x) => x.key === p)
        if (!meta) return null
        return (
          <span
            key={p}
            title={meta.label}
            className="h-5 w-5 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "#FAFAF5", color: "#5A3825" }}
          >
            {meta.icon}
          </span>
        )
      })}
    </div>
  )
}

// ─── Idea Card ───────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  pillar,
  onClick,
}: {
  idea: Idea
  pillar: ContentPillar | null
  onClick: () => void
}) {
  const fmt = getUiFormat(idea)
  const platforms = getStoredPlatforms(idea)
  const desc = idea.hook || idea.caption?.split(/[.\n]/)[0]?.trim() || "No description yet"

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#F97066]/40"
      style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <FormatBadge format={fmt} />
        <PlatformGlyphs platforms={platforms} />
      </div>

      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1.5" style={{ color: "#2D1810" }}>
        {idea.title || "Untitled idea"}
      </h3>

      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: "#7A5C50" }}>
        {desc}
      </p>

      {pillar && (
        <div className="flex items-center gap-1.5 pt-2 border-t" style={{ borderColor: "#F0EAE3" }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pillar.color }} />
          {pillar.emoji && <span className="text-[10px] leading-none">{pillar.emoji}</span>}
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#8A7060" }}>
            {pillar.name}
          </span>
        </div>
      )}
    </button>
  )
}

// ─── Pillar Tabs ─────────────────────────────────────────────────────────────

function PillarTabs({
  pillars,
  active,
  onChange,
  counts,
}: {
  pillars: ContentPillar[]
  active: string
  onChange: (id: string) => void
  counts: Record<string, number>
}) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const tabs = [
    { id: "all", label: "All pillars", color: "#F97066", emoji: null, count: totalCount },
    ...pillars.map((p) => ({ id: p.id, label: p.name, color: p.color, emoji: p.emoji, count: counts[p.id] ?? 0 })),
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
      <div className="inline-flex gap-2 w-max">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium min-h-[44px] border transition-all whitespace-nowrap",
              )}
              style={
                isActive
                  ? { backgroundColor: t.color, color: "white", borderColor: t.color }
                  : { backgroundColor: "white", color: "#5A3825", borderColor: "#E5DDD5" }
              }
            >
              {t.id !== "all" && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "white" : t.color }} />}
              {t.emoji && <span className="text-base leading-none">{t.emoji}</span>}
              <span>{t.label}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={
                  isActive
                    ? { backgroundColor: "rgba(255,255,255,0.25)", color: "white" }
                    : { backgroundColor: "#FAFAF5", color: "#8A7060" }
                }
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Side Rail ───────────────────────────────────────────────────────────────

type RailState = {
  ideaId: string | null
  pillarId: string | null
  title: string
  platforms: Platform[]
  format: UiFormat
  date: string
  time: string
  hook: string | null
  hooks: string[]
  caption: string
  hashtags: string[]
  mediaUrl: string | null
  mediaName: string | null
}

const EMPTY_RAIL: RailState = {
  ideaId: null,
  pillarId: null,
  title: "",
  platforms: ["instagram"],
  format: "post",
  date: "",
  time: "",
  hook: null,
  hooks: [],
  caption: "",
  hashtags: [],
  mediaUrl: null,
  mediaName: null,
}

function railFromIdea(idea: Idea): RailState {
  const fmt = getUiFormat(idea)
  const platforms = getStoredPlatforms(idea)
  const tags = idea.hashtags ? idea.hashtags.split(/\s+/).filter(Boolean).slice(0, 8).map((t) => t.replace(/^#/, "")) : []
  let date = ""
  let time = ""
  if (idea.scheduled_date) {
    if (idea.scheduled_date.includes("T")) {
      const d = new Date(idea.scheduled_date)
      date = d.toISOString().slice(0, 10)
      time = d.toTimeString().slice(0, 5)
    } else {
      date = idea.scheduled_date
    }
  }
  return {
    ideaId: idea.id,
    pillarId: idea.pillar_id,
    title: idea.title || "",
    platforms: platforms.length ? platforms : ["instagram"],
    format: fmt,
    date,
    time,
    hook: idea.hook,
    hooks: idea.hook ? [idea.hook] : [],
    caption: idea.caption ?? "",
    hashtags: tags,
    mediaUrl: idea.media_url,
    mediaName: null,
  }
}

function SideRail({
  open,
  onClose,
  state,
  setState,
  brand,
  pillars,
  userId,
  onSaved,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  state: RailState
  setState: (s: RailState | ((prev: RailState) => RailState)) => void
  brand: Brand | null
  pillars: ContentPillar[]
  userId: string
  onSaved: () => void
  onDeleted: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedPillar = pillars.find((p) => p.id === state.pillarId) ?? null

  const togglePlatform = (p: Platform) => {
    setState((prev) => {
      const has = prev.platforms.includes(p)
      const next = has ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p]
      return { ...prev, platforms: next.length === 0 ? [p] : next }
    })
  }

  const bestTime = useMemo(() => {
    const primary = state.platforms[0] ?? "instagram"
    return BEST_TIMES[primary]
  }, [state.platforms])

  const applyBestTime = () => {
    setState((prev) => ({ ...prev, time: bestTime.time }))
  }

  const handleFile = (file: File | null) => {
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 100MB", variant: "destructive" })
      return
    }
    const url = URL.createObjectURL(file)
    setState((prev) => ({ ...prev, mediaUrl: url, mediaName: file.name }))
  }

  const handleGenerate = async () => {
    if (!state.title.trim()) {
      toast({ title: "Add a title first", description: "Tell us what the post is about.", variant: "destructive" })
      return
    }
    setGenerating(true)
    try {
      const fmtMeta = formatMeta(state.format)
      const platformNotes = state.platforms.map((p) => PLATFORM_CAPTION_RULES[p]).join("\n")

      // 1) hooks
      const hookRes = await fetch("/api/generate-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: state.title,
          brandName: brand?.name,
          niche: brand?.niche,
          tone: brand?.tone_of_voice,
          targetAudience: brand?.target_audience,
          pillarName: selectedPillar?.name,
          pillarVoiceDirection: selectedPillar?.voice_direction,
          pillarFormatPreference: fmtMeta.dbFormat,
        }),
      })
      const hookData = await hookRes.json()
      if (!hookRes.ok) throw new Error(hookData.error ?? "Failed to generate hooks")
      const newHooks: string[] = Array.isArray(hookData.hooks) ? hookData.hooks.slice(0, 3) : []
      const firstHook = newHooks[0] ?? null

      // 2) caption + hashtags in parallel using first hook
      const [capRes, hashRes] = await Promise.all([
        fetch("/api/generate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hook: firstHook ?? state.title,
            notes: `${platformNotes}\nTopic: ${state.title}\nFormat: ${state.format}`,
            brandName: brand?.name,
            niche: brand?.niche,
            tone: brand?.tone_of_voice,
            targetAudience: brand?.target_audience,
            pillarName: selectedPillar?.name,
            pillarVoiceDirection: selectedPillar?.voice_direction,
            pillarFormatPreference: fmtMeta.dbFormat,
          }),
        }),
        fetch("/api/generate-hashtags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            niche: brand?.niche,
            caption: firstHook ?? state.title,
            brandName: brand?.name,
          }),
        }),
      ])
      const capData = await capRes.json()
      const hashData = await hashRes.json()
      if (!capRes.ok) throw new Error(capData.error ?? "Caption failed")

      const allTags: string[] = [
        ...(hashData?.niche ?? []),
        ...(hashData?.broad ?? []),
        ...(hashData?.engagement ?? []),
      ]
        .map((t: string) => t.replace(/^#/, ""))
        .filter(Boolean)
      const seen = new Set<string>()
      const uniq: string[] = []
      for (const t of allTags) {
        const k = t.toLowerCase()
        if (!seen.has(k)) {
          seen.add(k)
          uniq.push(t)
        }
        if (uniq.length === 5) break
      }

      setState((prev) => ({
        ...prev,
        hooks: newHooks,
        hook: firstHook,
        caption: capData.caption ?? "",
        hashtags: uniq,
      }))
      toast({ title: "Content generated", description: "Edit anything inline before saving." })
    } catch (err) {
      toast({
        title: "Couldn't generate content",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const persist = async (status: "idea" | "scheduled") => {
    if (!brand) {
      toast({ title: "Set up a brand first", variant: "destructive" })
      return null
    }
    if (!state.title.trim()) {
      toast({ title: "Add a title", description: "Every idea needs a name.", variant: "destructive" })
      return null
    }

    const fmtMeta = formatMeta(state.format)
    const scheduledIso =
      status === "scheduled" && state.date
        ? state.time
          ? `${state.date}T${state.time}:00`
          : state.date
        : null

    const scriptPayload = {
      ui_format: state.format,
      platforms: state.platforms,
    }

    const base: Record<string, unknown> = {
      user_id: userId,
      brand_id: brand.id,
      pillar_id: state.pillarId,
      format: fmtMeta.dbFormat,
      title: state.title.trim(),
      hook: state.hook,
      caption: state.caption || null,
      hashtags: state.hashtags.length
        ? state.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
        : null,
      script: scriptPayload,
      status,
    }
    if (scheduledIso) base.scheduled_date = scheduledIso

    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table = supabase.from("ideas") as any
      const { data, error } = state.ideaId
        ? await table.update(base).eq("id", state.ideaId).select().single()
        : await table.insert(base).select().single()

      if (error) {
        // fallback if scheduled_date column missing
        if (/scheduled_date/i.test(error.message ?? "") && base.scheduled_date) {
          delete base.scheduled_date
          const retry = state.ideaId
            ? await table.update(base).eq("id", state.ideaId).select().single()
            : await table.insert(base).select().single()
          if (retry.error) throw retry.error
          toast({ title: "Saved (without date)", description: "Run migration 005 to enable scheduling." })
          return retry.data as Idea
        }
        throw error
      }
      return data as Idea
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      toast({ title: "Couldn't save", description: msg, variant: "destructive" })
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    const saved = await persist("idea")
    if (saved) {
      toast({ title: "Saved as draft" })
      onSaved()
      onClose()
    }
  }

  const handleSchedule = async () => {
    if (!state.date) {
      toast({ title: "Pick a date first", variant: "destructive" })
      return
    }
    const saved = await persist("scheduled")
    if (saved) {
      toast({ title: state.ideaId ? "Rescheduled" : "Scheduled" })
      onSaved()
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!state.ideaId) return
    setDeleting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("ideas") as any).delete().eq("id", state.ideaId)
    setDeleting(false)
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Deleted" })
    onDeleted()
    onClose()
  }

  const copyAll = () => {
    const tags = state.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")
    const text = [state.hook, state.caption, tags].filter(Boolean).join("\n\n")
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: "rgba(45,24,16,0.45)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[460px] bg-[#FAFAF5] shadow-2xl overflow-y-auto flex flex-col"
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        <style jsx>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-[#FAFAF5]"
          style={{ borderColor: "#E5DDD5" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
              <Sparkles className="h-4 w-4" style={{ color: "#D4432A" }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: "#2D1810" }}>
              {state.ideaId ? "Edit post" : "New post"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-[#F5F0EA]"
            aria-label="Close"
          >
            <X className="h-5 w-5" style={{ color: "#5A3825" }} />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
              Title
            </label>
            <Input
              value={state.title}
              onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="What's this post about?"
              className="text-sm min-h-[44px]"
              style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
            />
          </div>

          {/* Pillar */}
          {pillars.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
                Pillar
              </label>
              <div className="flex flex-wrap gap-2">
                {pillars.map((p) => {
                  const active = state.pillarId === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, pillarId: active ? null : p.id }))}
                      className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-medium border min-h-[36px] transition-all"
                      style={
                        active
                          ? { borderColor: p.color, backgroundColor: p.color + "1A", color: "#2D1810" }
                          : { borderColor: "#E5DDD5", backgroundColor: "white", color: "#5A3825" }
                      }
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.emoji && <span className="text-sm leading-none">{p.emoji}</span>}
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Platforms */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = state.platforms.includes(p.key)
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePlatform(p.key)}
                    className="inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium border min-h-[40px] transition-all"
                    style={
                      active
                        ? { borderColor: "#F97066", backgroundColor: "#FEF0EA", color: "#D4432A" }
                        : { borderColor: "#E5DDD5", backgroundColor: "white", color: "#5A3825" }
                    }
                  >
                    {p.icon}
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => {
                const active = state.format === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, format: f.key }))}
                    className="rounded-xl border px-2.5 py-2.5 flex flex-col items-center gap-1 transition-all min-h-[68px]"
                    style={
                      active
                        ? { borderColor: f.text, backgroundColor: f.bg, color: f.text }
                        : { borderColor: "#E5DDD5", backgroundColor: "white", color: "#5A3825" }
                    }
                  >
                    {f.icon}
                    <span className="text-xs font-medium">{f.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date + time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
              When
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative sm:flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8A7060" }} />
                <Input
                  type="date"
                  value={state.date}
                  onChange={(e) => setState((prev) => ({ ...prev, date: e.target.value }))}
                  className="pl-9 min-h-[44px] text-sm"
                  style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
                />
              </div>
              <div className="relative sm:w-[140px]">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8A7060" }} />
                <Input
                  type="time"
                  value={state.time}
                  onChange={(e) => setState((prev) => ({ ...prev, time: e.target.value }))}
                  className="pl-9 min-h-[44px] text-sm"
                  style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={applyBestTime}
              className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors hover:bg-white"
              style={{ borderColor: "#F5C4BC", backgroundColor: "#FEF0EA", color: "#D4432A" }}
            >
              <Sparkles className="h-3 w-3" />
              Best time · {bestTime.label}
            </button>
          </div>

          {/* Visuals */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
              Visuals
            </label>
            <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}>
              {state.mediaUrl && (
                <div className="relative rounded-xl overflow-hidden bg-[#F5F0EA]" style={{ aspectRatio: "1" }}>
                  {state.mediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                    <video src={state.mediaUrl} className="w-full h-full object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={state.mediaUrl} alt={state.mediaName ?? "Uploaded media"} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, mediaUrl: null, mediaName: null }))}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(45,24,16,0.7)", color: "white" }}
                    aria-label="Remove media"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,video/mp4"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 transition-colors hover:bg-[#FAFAF5] min-h-[80px]"
                  style={{ borderColor: "#E5DDD5", color: "#5A3825" }}
                >
                  <Upload className="h-5 w-5" style={{ color: "#8A7060" }} />
                  <span className="text-xs font-medium">Upload your own</span>
                  <span className="text-[10px]" style={{ color: "#8A7060" }}>JPG · PNG · MP4 · 100MB</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCanvaTemplate(state.format, state.caption, state.hashtags)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all hover:-translate-y-0.5 min-h-[80px]"
                  style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", border: "1px solid #DDD6FE" }}
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-xs font-semibold">Design in Canva</span>
                  <span className="text-[10px]">Opens template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !state.title.trim()}
            className="w-full gap-2 min-h-[48px] font-semibold"
            style={{ backgroundColor: "#F97066", color: "white" }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {state.caption ? "Regenerate content" : "Generate content"}
          </Button>

          {/* Hooks */}
          {state.hooks.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
                Hooks
              </label>
              <div className="space-y-2">
                {state.hooks.map((h, i) => {
                  const active = state.hook === h
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, hook: h }))}
                      className="w-full text-left rounded-xl border p-3 text-sm leading-snug transition-all"
                      style={
                        active
                          ? { borderColor: "#F97066", backgroundColor: "#FEF0EA", color: "#2D1810", boxShadow: "0 0 0 2px rgba(249,112,102,0.25)" }
                          : { borderColor: "#E5DDD5", backgroundColor: "white", color: "#2D1810" }
                      }
                    >
                      <span
                        className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold mr-2 align-text-bottom"
                        style={{ backgroundColor: active ? "#F97066" : "#FEF0EA", color: active ? "white" : "#D4432A" }}
                      >
                        {i + 1}
                      </span>
                      {h}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Caption */}
          {(state.caption || state.hook) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8A7060" }}>
                  Caption
                </label>
                <button
                  type="button"
                  onClick={copyAll}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors hover:bg-[#FAFAF5]"
                  style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}
                >
                  {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy all"}
                </button>
              </div>
              <Textarea
                value={state.caption}
                onChange={(e) => setState((prev) => ({ ...prev, caption: e.target.value }))}
                rows={6}
                placeholder="Caption will appear here after you tap Generate."
                className="text-sm leading-relaxed"
                style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
              />
              {state.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {state.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
                    >
                      #{tag.replace(/^#/, "")}
                      <button
                        type="button"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            hashtags: prev.hashtags.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="opacity-50 hover:opacity-100"
                        aria-label="Remove hashtag"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="sticky bottom-0 px-5 py-4 border-t bg-[#FAFAF5] flex items-center gap-2"
          style={{ borderColor: "#E5DDD5", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          {state.ideaId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-11 w-11 rounded-xl border flex items-center justify-center transition-colors hover:bg-[#FEE2E2]"
              style={{ borderColor: "#E5DDD5", color: "#DC2626" }}
              aria-label="Delete"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 gap-2 min-h-[44px]"
            style={{ borderColor: "#E5DDD5", color: "#5A3825", backgroundColor: "white" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={saving || !state.date}
            className="flex-1 gap-2 min-h-[44px]"
            style={{ backgroundColor: "#F97066", color: "white" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {state.ideaId && state.date ? "Reschedule" : "Schedule"}
          </Button>
        </div>
      </aside>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContentCreatorClient({
  brand,
  initialPillars,
  userId,
}: {
  brand: Brand | null
  initialPillars: ContentPillar[]
  socialAccounts: Record<string, string>
  userId: string
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [pillars] = useState<ContentPillar[]>(initialPillars)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [activePillarId, setActivePillarId] = useState<string>("all")
  const [railOpen, setRailOpen] = useState(false)
  const [railState, setRailState] = useState<RailState>(EMPTY_RAIL)
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  const fetchIdeas = async () => {
    if (!brand) {
      setIdeas([])
      setLoading(false)
      return
    }
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("ideas") as any)
      .select("*")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })

    if (error) {
      const msg = error.message ?? ""
      if (msg.includes("relation") && msg.includes("does not exist")) {
        setMigrationNeeded(true)
      } else {
        toast({ title: "Couldn't load ideas", description: msg, variant: "destructive" })
      }
    }
    setIdeas((data ?? []) as Idea[])
    setLoading(false)
  }

  useEffect(() => {
    fetchIdeas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    pillars.forEach((p) => { c[p.id] = 0 })
    c["__unsorted"] = 0
    ideas.forEach((i) => {
      if (i.pillar_id && c[i.pillar_id] !== undefined) c[i.pillar_id]++
      else c["__unsorted"]++
    })
    return c
  }, [ideas, pillars])

  const filteredIdeas = useMemo(() => {
    if (activePillarId === "all") return ideas
    return ideas.filter((i) => i.pillar_id === activePillarId)
  }, [ideas, activePillarId])

  const openNew = () => {
    setRailState({
      ...EMPTY_RAIL,
      pillarId: activePillarId === "all" ? null : activePillarId,
    })
    setRailOpen(true)
  }

  const openExisting = (idea: Idea) => {
    setRailState(railFromIdea(idea))
    setRailOpen(true)
  }

  // Empty / error states
  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
          <Sparkles className="h-8 w-8" style={{ color: "#F97066" }} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: "#2D1810" }}>No brand set up yet</h2>
          <p className="text-sm mt-1" style={{ color: "#8A7060" }}>
            Create a brand profile so the AI can generate content tailored to your niche and tone.
          </p>
        </div>
        <Button asChild style={{ backgroundColor: "#F97066", color: "white" }}>
          <a href="/settings">Set up your brand →</a>
        </Button>
      </div>
    )
  }

  if (migrationNeeded) {
    return (
      <div className="rounded-2xl border px-5 py-6 space-y-3" style={{ backgroundColor: "#FFFBEA", borderColor: "#F5DFA0" }}>
        <p className="text-sm font-semibold" style={{ color: "#6B4D00" }}>Database migration needed</p>
        <p className="text-xs" style={{ color: "#92680A" }}>
          The <code>ideas</code> table doesn&apos;t exist yet. Run the project migrations in Supabase, then refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Pillar tabs + new post */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {pillars.length > 0 ? (
            <PillarTabs pillars={pillars} active={activePillarId} onChange={setActivePillarId} counts={counts} />
          ) : (
            <p className="text-sm" style={{ color: "#8A7060" }}>
              No content pillars yet —{" "}
              <a href="/content-pillars" className="font-semibold underline" style={{ color: "#F97066" }}>
                add some
              </a>{" "}
              to organise your ideas.
            </p>
          )}
        </div>
        <Button
          onClick={openNew}
          className="gap-2 shrink-0 min-h-[44px]"
          style={{ backgroundColor: "#F97066", color: "white" }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New post</span>
        </Button>
      </div>

      {/* Ideas grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border bg-white p-4 h-[160px] animate-pulse"
              style={{ borderColor: "#E5DDD5" }}
            />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div
          className="rounded-2xl border bg-white px-6 py-16 text-center"
          style={{ borderColor: "#E5DDD5" }}
        >
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#FEF0EA" }}>
            <Sparkles className="h-7 w-7" style={{ color: "#F97066" }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "#2D1810" }}>
            {activePillarId === "all" ? "No post ideas yet" : "Nothing in this pillar yet"}
          </h3>
          <p className="text-sm mt-1 mb-4" style={{ color: "#8A7060" }}>
            Tap <span className="font-semibold">New post</span> to draft your first idea.
          </p>
          <Button onClick={openNew} className="gap-2" style={{ backgroundColor: "#F97066", color: "white" }}>
            <Plus className="h-4 w-4" />
            New post
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              pillar={pillars.find((p) => p.id === idea.pillar_id) ?? null}
              onClick={() => openExisting(idea)}
            />
          ))}
        </div>
      )}

      {/* Side rail */}
      <SideRail
        open={railOpen}
        onClose={() => setRailOpen(false)}
        state={railState}
        setState={setRailState}
        brand={brand}
        pillars={pillars}
        userId={userId}
        onSaved={fetchIdeas}
        onDeleted={fetchIdeas}
      />
    </div>
  )
}
