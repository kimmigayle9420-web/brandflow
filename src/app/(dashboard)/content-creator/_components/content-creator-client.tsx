"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles, Loader2, Copy, Check, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, ImageIcon, RefreshCw,
  FileText, Film, LayoutGrid, Save, Download, Wand2,
  Hash, AlignLeft, Music, Globe, Search, Layers, Plus, Trash2,
  Bookmark, BookmarkCheck, ArrowLeft, Zap, Type, Mic2,
} from "lucide-react"
import type { Brand, ContentPillar, Idea } from "@/types"

// ── Types ────────────────────────────────────────────────────────────────────

interface CarouselSlide {
  id: number
  type: "cover" | "content" | "cta"
  title: string
  hook?: string
  bullets?: string[]
  cta?: string
}

interface ReelScene {
  timestamp: string
  description: string
}

interface ReelScript {
  hook: string
  scenes: ReelScene[]
  voiceover: string
  audioMood: string
  cta: string
}

interface HashtagGroups {
  niche: string[]
  broad: string[]
  engagement: string[]
}

type ProfileAnalysis = {
  contentStrategy: string
  postingPatterns: string
  hookStyles: string[]
  topicClusters: string[]
  toneAndVoice: string
  whatToSteal: string[]
  gaps: string[]
}

type ContentOpportunity = {
  contentGaps: string[]
  topOpportunities: Array<{ angle: string; why: string; format: "Reel" | "Carousel" | "Post" }>
  audienceInsights: string
  suggestedPillars: string[]
}

type ContentAngle = { angle: string; rationale: string }
type PostingFormat = { format: string; reasoning: string; priority: "high" | "medium" | "low" }

type NicheResearchResult = {
  contentAngles: ContentAngle[]
  painPoints: string[]
  trendingTopics: string[]
  postingFormats: PostingFormat[]
  contentGaps: string[]
}

type GeneratedPillar = {
  name: string
  emoji: string
  description: string
  postIdeas: string[]
  voice_direction?: string
  format_preference?: string
}

type SavedInsight = {
  id: string
  text: string
  source: "opportunity" | "niche" | "analyser"
  savedAt: number
}

type FormatRecommendation = {
  format: "Post" | "Carousel" | "Reel"
  reasoning: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_COLORS = [
  "#f97316", "#ec4899", "#8b5cf6", "#6366f1",
  "#14b8a6", "#22c55e", "#eab308", "#f43f5e",
  "#0ea5e9", "#64748b",
]

const LS_OPPORTUNITY_KEY_PREFIX = "content-opportunity"
const LS_PROFILE_LEFT_KEY = "brandflow:profile-analyser-left"
const LS_PROFILE_RIGHT_KEY = "brandflow:profile-analyser-right"
const LS_NICHE_RESULTS_KEY = "brandflow:niche-results"
const LS_NICHE_CUSTOM_KEY = "brandflow:niche-custom-topics"
const LS_SAVED_INSIGHTS_KEY_PREFIX = "brandflow:saved-insights"
const OPPORTUNITY_TTL = 24 * 60 * 60 * 1000
const MAX_SAVED_INSIGHTS = 10

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPollinationsUrl(prompt: string, niche?: string, seed?: number): string {
  const fullPrompt = [
    prompt,
    niche ? `${niche} aesthetic` : "",
    "professional content creator photography, high quality, instagram",
  ].filter(Boolean).join(", ")
  const encoded = encodeURIComponent(fullPrompt)
  const seedParam = seed !== undefined ? `&seed=${seed}` : ""
  return `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true${seedParam}`
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

function buildProfileUrl(platform: string, handle: string): string | null {
  const h = handle.replace(/^@/, "")
  if (!h) return null
  switch (platform.toLowerCase()) {
    case "instagram": return `https://instagram.com/${h}`
    case "tiktok": return `https://tiktok.com/@${h}`
    case "youtube": return `https://youtube.com/@${h}`
    case "twitter": case "x": return `https://twitter.com/${h}`
    case "facebook": return `https://facebook.com/${h}`
    case "linkedin": return `https://linkedin.com/in/${h}`
    case "pinterest": return `https://pinterest.com/${h}`
    default: return null
  }
}

// ── Canva / CapCut Integration ───────────────────────────────────────────────

function openInCanva(options: {
  title: string
  caption: string
  hashtags: string
  slides?: CarouselSlide[]
  format: 'post' | 'story' | 'carousel' | 'reel'
}) {
  const { title, caption, hashtags, slides, format } = options
  let textToCopy = ""
  let url = ""
  let toastMsg = ""

  if (format === 'carousel' && slides && slides.length > 0) {
    const lines: string[] = [`CAROUSEL: ${title}\n`]
    slides.forEach((s, i) => {
      lines.push(`SLIDE ${i + 1} [${s.type.toUpperCase()}]`)
      lines.push(`Title: ${s.title}`)
      if (s.type === "cover" && s.hook) lines.push(`Hook: ${s.hook}`)
      if (s.type === "content" && s.bullets) s.bullets.forEach((b) => lines.push(`  • ${b}`))
      if (s.type === "cta" && s.cta) lines.push(`CTA: ${s.cta}`)
      lines.push("")
    })
    textToCopy = lines.join("\n")
    url = "https://www.canva.com/create/instagram-carousel-posts/"
    toastMsg = "Slide outline copied — paste it into your Canva design"
  } else if (format === 'reel') {
    textToCopy = [title, caption, hashtags].filter(Boolean).join("\n\n")
    url = "https://www.capcut.com"
    toastMsg = "Script copied — paste it into CapCut as your script reference"
  } else {
    textToCopy = [caption, hashtags].filter(Boolean).join("\n\n")
    url = "https://www.canva.com/create/instagram-posts/"
    toastMsg = "Caption copied to clipboard — paste it into your Canva design"
  }

  navigator.clipboard.writeText(textToCopy).catch(() => {})
  window.open(url, "_blank", "noopener,noreferrer")
  return toastMsg
}

// ── Canva Button ─────────────────────────────────────────────────────────────

function CanvaButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={{ backgroundColor: "#EDE9FE", color: "#5B21B6", border: "1px solid #DDD6FE" }}
    >
      <span className="text-base leading-none">✨</span>
      {label}
    </button>
  )
}

// ── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  if (label) {
    return (
      <Button size="sm" variant="outline" onClick={handleCopy}
        className="gap-1.5 h-7 text-xs"
        style={{ color: "#7A5C50", borderColor: "#E5DDD5" }}>
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied!" : label}
      </Button>
    )
  }
  return (
    <button onClick={handleCopy} title="Copy"
      className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[#FEF0EA]">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" style={{ color: "#8A7060" }} />}
    </button>
  )
}

// ── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, className }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border bg-white p-5 space-y-4", className)}
      style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#FEF0EA" }}>
          <span style={{ color: "#D4432A" }}>{icon}</span>
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "#2D1810" }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span style={{ color: "#F97066" }}>{icon}</span>}
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8A7060" }}>{label}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: "#E5DDD5" }} />
    </div>
  )
}

// ── Primary Action Button ─────────────────────────────────────────────────────

function ActionButton({ onClick, loading, disabled, children, className }: {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Button onClick={onClick} disabled={loading || disabled}
      className={cn("gap-2 font-medium", className)}
      style={{ backgroundColor: "#F97066", color: "white" }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {children}
    </Button>
  )
}

// ── Pollinations Image Panel ──────────────────────────────────────────────────

function ImagePanel({
  label, prompt, onPromptChange, imageUrl, imageLoaded, imageError,
  onGenerate, onRegenerate, onLoad, onError, generating, aspectRatio = "aspect-square",
}: {
  label: string
  prompt: string
  onPromptChange: (v: string) => void
  imageUrl: string | null
  imageLoaded: boolean
  imageError: boolean
  onGenerate: () => void
  onRegenerate: () => void
  onLoad: () => void
  onError: () => void
  generating: boolean
  aspectRatio?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={`Describe your ${label.toLowerCase()}…`}
          className="flex-1 text-sm"
          style={{ borderColor: "#E5DDD5" }}
        />
        <Button onClick={onGenerate} disabled={!prompt.trim() || generating} size="sm"
          className="gap-1.5 shrink-0" style={{ backgroundColor: "#F97066", color: "white" }}>
          {generating && !imageLoaded
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ImageIcon className="h-3.5 w-3.5" />}
          Generate
        </Button>
        {imageUrl && (
          <Button onClick={onRegenerate} size="sm" variant="outline"
            className="gap-1.5 shrink-0" style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {imageUrl && (
        <div className={cn("relative w-full rounded-xl overflow-hidden bg-[#F5F0EA]", aspectRatio)}>
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#F97066" }} />
              <p className="text-xs" style={{ color: "#8A7060" }}>Generating image…</p>
            </div>
          )}
          {imageError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <ImageIcon className="h-8 w-8" style={{ color: "#C4B5A5" }} />
              <p className="text-xs" style={{ color: "#8A7060" }}>Generation failed — try regenerating</p>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`Generated ${label.toLowerCase()}`}
            className={cn("w-full h-full object-cover", imageLoaded ? "opacity-100" : "opacity-0")}
            style={{ transition: "opacity 0.3s ease" }}
            onLoad={onLoad}
            onError={onError}
          />
        </div>
      )}
    </div>
  )
}

// ── Instagram Preview Panel ───────────────────────────────────────────────────

function InstagramPreview({
  brandName, caption, hashtags, imageUrl, imageLoaded,
}: {
  brandName: string
  caption: string
  hashtags: HashtagGroups | null
  imageUrl: string | null
  imageLoaded: boolean
}) {
  const allHashtags = hashtags
    ? [...hashtags.niche, ...hashtags.broad, ...hashtags.engagement].join(" ")
    : ""
  return (
    <div className="rounded-2xl border bg-white overflow-hidden"
      style={{ borderColor: "#E5DDD5", boxShadow: "0 2px 8px rgba(45,24,16,0.08)" }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b" style={{ borderColor: "#F0EAE3" }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: "#F97066" }}>
          {brandName ? brandName.charAt(0).toUpperCase() : "B"}
        </div>
        <div>
          <p className="text-xs font-semibold leading-none" style={{ color: "#2D1810" }}>
            {brandName ? brandName.toLowerCase().replace(/\s+/g, "_") : "your_brand"}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#8A7060" }}>Sponsored</p>
        </div>
        <div className="ml-auto text-lg leading-none" style={{ color: "#2D1810" }}>···</div>
      </div>
      <div className="aspect-square w-full bg-[#F5F0EA] flex items-center justify-center relative overflow-hidden">
        {imageUrl && imageLoaded ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Post image" className="w-full h-full object-cover" />
        ) : imageUrl && !imageLoaded ? (
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#F97066" }} />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-10 w-10" style={{ color: "#C4B5A5" }} />
            <p className="text-xs" style={{ color: "#8A7060" }}>Image preview</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-3 py-2" style={{ color: "#2D1810" }}>
        <span className="text-xl">♡</span>
        <span className="text-xl">💬</span>
        <span className="text-xl">↗</span>
        <span className="ml-auto text-xl">🔖</span>
      </div>
      <div className="px-3 pb-3 space-y-1.5">
        {caption ? (
          <p className="text-xs leading-relaxed" style={{ color: "#2D1810" }}>
            <span className="font-semibold">
              {brandName ? brandName.toLowerCase().replace(/\s+/g, "_") : "your_brand"}
            </span>{" "}
            {caption.length > 180 ? caption.substring(0, 180) + "…" : caption}
          </p>
        ) : (
          <p className="text-xs italic" style={{ color: "#C4B5A5" }}>Caption will appear here…</p>
        )}
        {allHashtags && (
          <p className="text-xs leading-relaxed" style={{ color: "#7B9ED9" }}>
            {allHashtags.length > 120 ? allHashtags.substring(0, 120) + "…" : allHashtags}
          </p>
        )}
        <p className="text-[10px]" style={{ color: "#8A7060" }}>View all comments</p>
      </div>
    </div>
  )
}

// ── Carousel Mobile Preview ───────────────────────────────────────────────────

function CarouselMobilePreview({
  slides, currentIndex, onPrev, onNext, imageUrl, imageLoaded,
}: {
  slides: CarouselSlide[]
  currentIndex: number
  onPrev: () => void
  onNext: () => void
  imageUrl: string | null
  imageLoaded: boolean
}) {
  const slide = slides[currentIndex]
  if (!slide) return null
  const bgColor = slide.type === "cover" ? "#FEF0EA" : slide.type === "cta" ? "#F97066" : "#FFFFFF"
  const textColor = slide.type === "cta" ? "#FFFFFF" : "#2D1810"
  const mutedColor = slide.type === "cta" ? "rgba(255,255,255,0.8)" : "#8A7060"
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-[260px] rounded-3xl border-4 overflow-hidden"
        style={{ borderColor: "#2D1810", boxShadow: "0 4px 20px rgba(45,24,16,0.2)" }}>
        {slide.type === "cover" && imageUrl && imageLoaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Cover" className="w-full aspect-video object-cover" />
        )}
        {slide.type === "cover" && imageUrl && !imageLoaded && (
          <div className="w-full aspect-video flex items-center justify-center" style={{ backgroundColor: "#F5F0EA" }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#F97066" }} />
          </div>
        )}
        <div className="p-4 min-h-[200px] flex flex-col justify-center" style={{ backgroundColor: bgColor }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.08)", color: textColor }}>
              {currentIndex + 1} / {slides.length}
            </span>
            {slide.type === "cover" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#F97066", color: "white" }}>COVER</span>
            )}
            {slide.type === "cta" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.3)", color: "white" }}>CTA</span>
            )}
          </div>
          <h3 className="text-sm font-bold leading-tight mb-2" style={{ color: textColor }}>
            {slide.title || "Slide title"}
          </h3>
          {slide.type === "cover" && slide.hook && (
            <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>{slide.hook}</p>
          )}
          {slide.type === "content" && slide.bullets && (
            <ul className="space-y-1.5 mt-1">
              {slide.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[10px] font-bold mt-0.5" style={{ color: "#F97066" }}>→</span>
                  <span className="text-[10px] leading-relaxed" style={{ color: mutedColor }}>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {slide.type === "cta" && slide.cta && (
            <p className="text-xs leading-relaxed mt-1" style={{ color: mutedColor }}>{slide.cta}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onPrev} disabled={currentIndex === 0}
          className="h-8 w-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs" style={{ color: "#8A7060" }}>{currentIndex + 1} of {slides.length}</span>
        <button onClick={onNext} disabled={currentIndex === slides.length - 1}
          className="h-8 w-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Section 1: Content Opportunity Hero ──────────────────────────────────────

function ContentOpportunityHero({
  brand,
  socialAccounts,
  userId,
  onOpportunityLoaded,
  onSaveInsight,
}: {
  brand: Brand | null
  socialAccounts: Record<string, string>
  userId: string
  onOpportunityLoaded?: (opp: ContentOpportunity) => void
  onSaveInsight?: (text: string, source: "opportunity") => void
}) {
  const lsKey = `${LS_OPPORTUNITY_KEY_PREFIX}-${userId}`
  const [result, setResult] = useState<ContentOpportunity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const hasSocials = Object.keys(socialAccounts).length > 0
  const socialUrls = Object.entries(socialAccounts)
    .map(([platform, handle]) => buildProfileUrl(platform, handle))
    .filter((url): url is string => Boolean(url))

  const fetchOpportunity = async (force = false) => {
    if (!brand?.niche) return
    if (!force) {
      const cached = lsGet<{ result: ContentOpportunity; timestamp: number }>(lsKey)
      if (cached && Date.now() - cached.timestamp < OPPORTUNITY_TTL) {
        setResult(cached.result)
        onOpportunityLoaded?.(cached.result)
        return
      }
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/research-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: brand.niche,
          targetAudience: brand.target_audience ?? "",
          tone: brand.tone_of_voice ?? "",
          socialUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch opportunity")
      setResult(data)
      lsSet(lsKey, { result: data, timestamp: Date.now() })
      onOpportunityLoaded?.(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyse opportunity")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchOpportunity()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatColor = (fmt: string) => {
    if (fmt === "Reel") return { bg: "#FEF0EA", text: "#D4432A" }
    if (fmt === "Carousel") return { bg: "#F0F4FF", text: "#5B6AC4" }
    return { bg: "#F0FDF4", text: "#16A34A" }
  }

  if (!brand?.niche) return null

  return (
    <div className="rounded-2xl p-6 space-y-5"
      style={{
        background: "linear-gradient(135deg, #FFF7F0 0%, #FFF0EF 50%, #FFF5F0 100%)",
        border: "1px solid #F5D0C8",
        boxShadow: "0 2px 12px rgba(249,112,102,0.10)",
      }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#F97066" }}>
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-base font-bold" style={{ color: "#2D1810" }}>Your Content Opportunity</h2>
          </div>
          {!loading && result && (
            <p className="text-xs" style={{ color: "#A07060" }}>Personalised for {brand.niche}</p>
          )}
        </div>
        {(result || error) && !loading && (
          <button
            onClick={() => fetchOpportunity(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/60"
            style={{ borderColor: "#F5D0C8", color: "#C05040" }}>
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        )}
      </div>

      {!hasSocials && !loading && !result && !error && (
        <div className="py-3">
          <p className="text-sm" style={{ color: "#7A5C50" }}>
            Connect your social accounts on the{" "}
            <a href="/dashboard" className="font-semibold underline" style={{ color: "#F97066" }}>Dashboard</a>
            {" "}to unlock personalised content opportunities.
          </p>
          <button onClick={() => fetchOpportunity(true)} className="mt-3 text-xs underline" style={{ color: "#A07060" }}>
            Continue without social accounts →
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="space-y-2">
            {[0.75, 1, 0.6].map((w, i) => (
              <div key={i} className="h-4 rounded animate-pulse" style={{ width: `${w * 100}%`, backgroundColor: "#F5C4BC" }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: "#F5C4BC" }} />
            ))}
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-6 w-24 rounded-full animate-pulse" style={{ backgroundColor: "#F5C4BC" }} />
            ))}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed" style={{ color: "#5A3828" }}>
            {result.audienceInsights}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.topOpportunities?.map((opp, i) => {
              const { bg, text } = formatColor(opp.format)
              return (
                <div key={i} className="rounded-xl bg-white/70 border p-4 space-y-2 relative"
                  style={{ borderColor: "#F0C8C0" }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: bg, color: text }}>
                      {opp.format}
                    </span>
                    {onSaveInsight && (
                      <button
                        onClick={() => onSaveInsight(opp.angle, "opportunity")}
                        title="Save to brief insights"
                        className="h-5 w-5 flex items-center justify-center rounded-full transition-colors hover:bg-white/80 shrink-0"
                        style={{ color: "#F97066" }}>
                        <Bookmark className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug" style={{ color: "#2D1810" }}>
                    {opp.angle}
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#8A7060" }}>
                    {opp.why}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {result.contentGaps?.map((gap, i) => (
              <button key={i}
                onClick={() => onSaveInsight?.(gap, "opportunity")}
                className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium transition-all hover:opacity-80 group"
                style={{ backgroundColor: "#FDE8E5", color: "#C05040", border: "1px solid #F5C4BC" }}>
                <span style={{ color: "#F97066" }}>✦</span>
                {gap}
                {onSaveInsight && <Bookmark className="h-2.5 w-2.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile Analysis Display ───────────────────────────────────────────────────

function ProfileAnalysisDisplay({ result }: { result: ProfileAnalysis }) {
  return (
    <div className="space-y-2 pt-1">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Strategy", value: result.contentStrategy, span: 2 },
          { label: "Patterns", value: result.postingPatterns, span: 1 },
          { label: "Tone & Voice", value: result.toneAndVoice, span: 1 },
        ].map(({ label, value, span }) => value ? (
          <div key={label}
            className={cn("rounded-xl border p-3 space-y-1", span === 2 ? "col-span-2" : "")}
            style={{ borderColor: "#E5DDD5", backgroundColor: "#FAFAF5" }}>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>{label}</span>
            <p className="text-xs leading-relaxed" style={{ color: "#2D1810" }}>
              {value.length > 100 ? value.substring(0, 100) + "…" : value}
            </p>
          </div>
        ) : null)}
      </div>
      {result.hookStyles?.length > 0 && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#E5DDD5" }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Hook Styles</span>
          <div className="flex flex-wrap gap-1.5">
            {result.hookStyles.map((h, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: "#FEF0EA", color: "#D4432A" }}>{h}</span>
            ))}
          </div>
        </div>
      )}
      {result.topicClusters?.length > 0 && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#E5DDD5" }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Topic Clusters</span>
          <div className="flex flex-wrap gap-1.5">
            {result.topicClusters.map((t, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#F0F4FF", color: "#5B6AC4" }}>{t}</span>
            ))}
          </div>
        </div>
      )}
      {result.whatToSteal?.length > 0 && (
        <div className="rounded-xl border p-3 space-y-1.5" style={{ borderColor: "#E5DDD5" }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>What To Steal</span>
          {result.whatToSteal.map((idea, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "#2D1810" }}>
              <span className="mt-0.5 shrink-0" style={{ color: "#F97066" }}>→</span>
              <span>{idea}</span>
            </div>
          ))}
        </div>
      )}
      {result.gaps?.length > 0 && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#E5DDD5" }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Gaps to Own</span>
          <div className="flex flex-wrap gap-1.5">
            {result.gaps.map((g, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#F0FDF4", color: "#16A34A" }}>{g}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section 2: Dual Column Analyser ──────────────────────────────────────────

function DualColumnAnalyser({ socialAccounts }: { socialAccounts: Record<string, string> }) {
  const connectedPlatforms = Object.keys(socialAccounts)

  const [leftUrl, setLeftUrl] = useState<string>(() =>
    lsGet<{ url: string; result: ProfileAnalysis }>(LS_PROFILE_LEFT_KEY)?.url ?? ""
  )
  const [leftResult, setLeftResult] = useState<ProfileAnalysis | null>(() =>
    lsGet<{ url: string; result: ProfileAnalysis }>(LS_PROFILE_LEFT_KEY)?.result ?? null
  )
  const [leftLoading, setLeftLoading] = useState(false)
  const [leftError, setLeftError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  const [rightUrl, setRightUrl] = useState<string>(() =>
    lsGet<{ url: string; result: ProfileAnalysis }>(LS_PROFILE_RIGHT_KEY)?.url ?? ""
  )
  const [rightResult, setRightResult] = useState<ProfileAnalysis | null>(() =>
    lsGet<{ url: string; result: ProfileAnalysis }>(LS_PROFILE_RIGHT_KEY)?.result ?? null
  )
  const [rightLoading, setRightLoading] = useState(false)
  const [rightError, setRightError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedPlatform && socialAccounts[selectedPlatform]) {
      const url = buildProfileUrl(selectedPlatform, socialAccounts[selectedPlatform])
      if (url) setLeftUrl(url)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform])

  const analyse = async (url: string, side: "left" | "right") => {
    const trimmed = url.trim()
    if (!trimmed) return
    const setLoading = side === "left" ? setLeftLoading : setRightLoading
    const setError = side === "left" ? setLeftError : setRightError
    const setResult = side === "left" ? setLeftResult : setRightResult
    const setUrl = side === "left" ? setLeftUrl : setRightUrl
    const lsKey = side === "left" ? LS_PROFILE_LEFT_KEY : LS_PROFILE_RIGHT_KEY

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/research-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Analysis failed")
      setResult(data)
      setUrl(trimmed)
      lsSet(lsKey, { url: trimmed, result: data })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Social Profile */}
      <div className="rounded-2xl border bg-white p-5 space-y-3"
        style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
            <Globe className="h-3.5 w-3.5" style={{ color: "#D4432A" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Social Profile Analyser</span>
        </div>

        {connectedPlatforms.length > 0 && (
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="w-full text-sm rounded-xl border px-3 h-9"
            style={{ borderColor: "#E5DDD5", color: "#2D1810" }}>
            <option value="">Select a connected account…</option>
            {connectedPlatforms.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)} (@{socialAccounts[p]})
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <Input
            value={leftUrl}
            onChange={(e) => setLeftUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !leftLoading && analyse(leftUrl, "left")}
            placeholder={connectedPlatforms.length > 0 ? "Or paste a competitor URL…" : "Paste an Instagram, TikTok, or profile URL…"}
            className="flex-1 text-sm h-9"
            style={{ borderColor: "#E5DDD5" }}
          />
          <Button onClick={() => analyse(leftUrl, "left")} disabled={leftLoading || !leftUrl.trim()} size="sm"
            className="shrink-0 gap-1.5" style={{ backgroundColor: "#F97066", color: "white" }}>
            {leftLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {leftLoading ? "Analysing…" : "Analyse"}
          </Button>
        </div>

        {leftError && <p className="text-xs" style={{ color: "#ef4444" }}>{leftError}</p>}

        {leftLoading && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "#F5F0EA" }} />
            ))}
          </div>
        )}

        {leftResult && !leftLoading && (
          <div>
            <ProfileAnalysisDisplay result={leftResult} />
            <button
              onClick={() => { setLeftResult(null); setLeftUrl(""); localStorage.removeItem(LS_PROFILE_LEFT_KEY) }}
              className="mt-2 text-[10px] underline" style={{ color: "#C4B5A5" }}>
              Clear
            </button>
          </div>
        )}

        {!leftResult && !leftLoading && !leftError && (
          <p className="text-xs" style={{ color: "#C4B5A5" }}>
            Select a connected account or paste any profile URL for content strategy analysis.
          </p>
        )}
      </div>

      {/* Right: Website / URL */}
      <div className="rounded-2xl border bg-white p-5 space-y-3"
        style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
            <Search className="h-3.5 w-3.5" style={{ color: "#D4432A" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Website / URL Analyser</span>
        </div>

        <div className="flex gap-2">
          <Input
            value={rightUrl}
            onChange={(e) => setRightUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !rightLoading && analyse(rightUrl, "right")}
            placeholder="Paste any website, blog, or landing page URL…"
            className="flex-1 text-sm h-9"
            style={{ borderColor: "#E5DDD5" }}
          />
          <Button onClick={() => analyse(rightUrl, "right")} disabled={rightLoading || !rightUrl.trim()} size="sm"
            className="shrink-0 gap-1.5" style={{ backgroundColor: "#F97066", color: "white" }}>
            {rightLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {rightLoading ? "Analysing…" : "Analyse"}
          </Button>
        </div>

        {rightError && <p className="text-xs" style={{ color: "#ef4444" }}>{rightError}</p>}

        {rightLoading && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "#F5F0EA" }} />
            ))}
          </div>
        )}

        {rightResult && !rightLoading && (
          <div>
            <ProfileAnalysisDisplay result={rightResult} />
            <button
              onClick={() => { setRightResult(null); setRightUrl(""); localStorage.removeItem(LS_PROFILE_RIGHT_KEY) }}
              className="mt-2 text-[10px] underline" style={{ color: "#C4B5A5" }}>
              Clear
            </button>
          </div>
        )}

        {!rightResult && !rightLoading && !rightError && (
          <p className="text-xs" style={{ color: "#C4B5A5" }}>
            Paste any website or URL to extract content strategy intelligence — great for competitor research.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Section 3: Niche Research ─────────────────────────────────────────────────

const NICHE_CATEGORY_ICONS: Record<string, string> = {
  angles: "💡", pain: "😣", trending: "🔥", formats: "🎯", gaps: "✦",
}

function NicheResearch({ opportunityResult, onSaveInsight }: {
  opportunityResult: ContentOpportunity | null
  onSaveInsight?: (text: string, source: "niche") => void
}) {
  const autoTopics: string[] = opportunityResult
    ? [
        ...(opportunityResult.topOpportunities?.map((o) => o.angle) ?? []),
        ...(opportunityResult.contentGaps ?? []),
      ]
    : []

  const [customTopics, setCustomTopics] = useState<string[]>(() =>
    lsGet<string[]>(LS_NICHE_CUSTOM_KEY) ?? []
  )
  const allPills = [...autoTopics, ...customTopics]

  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [customInput, setCustomInput] = useState("")
  const [nicheResults, setNicheResults] = useState<Record<string, NicheResearchResult>>(() =>
    lsGet<Record<string, NicheResearchResult>>(LS_NICHE_RESULTS_KEY) ?? {}
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAutoRunRef = useRef(false)

  const researchTopic = async (topic: string) => {
    const trimmed = topic.trim()
    if (!trimmed) return
    setSelectedTopic(trimmed)
    if (nicheResults[trimmed]) return // Already cached
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/research-niche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Research failed")
      setNicheResults((prev) => {
        const updated = { ...prev, [trimmed]: data }
        lsSet(LS_NICHE_RESULTS_KEY, updated)
        return updated
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Research failed.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-research first pill once opportunity data arrives
  useEffect(() => {
    if (!hasAutoRunRef.current && allPills.length > 0) {
      hasAutoRunRef.current = true
      researchTopic(allPills[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPills.length])

  const addCustomTopic = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (!allPills.includes(trimmed)) {
      const updated = [...customTopics, trimmed]
      setCustomTopics(updated)
      lsSet(LS_NICHE_CUSTOM_KEY, updated)
    }
    setCustomInput("")
    researchTopic(trimmed)
  }

  const currentResult = selectedTopic ? nicheResults[selectedTopic] : null

  const categories = [
    { key: "angles",   label: "Content Angles",       items: currentResult?.contentAngles?.map((a) => a.angle) ?? [] },
    { key: "pain",     label: "Audience Pain Points",  items: currentResult?.painPoints ?? [] },
    { key: "trending", label: "Trending Topics",       items: currentResult?.trendingTopics ?? [] },
    { key: "formats",  label: "Best Formats",          items: currentResult?.postingFormats?.map((f) => `${f.format} · ${f.priority} priority`) ?? [] },
    { key: "gaps",     label: "Content Gaps",          items: currentResult?.contentGaps ?? [] },
  ]

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4"
      style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
          <Search className="h-3.5 w-3.5" style={{ color: "#D4432A" }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Niche Research</span>
      </div>

      {/* Smart pills */}
      {allPills.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A07060" }}>
            {autoTopics.length > 0 ? "From your content opportunity — click to research:" : "Your research topics:"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {autoTopics.map((topic, i) => (
              <button key={`auto-${i}`}
                onClick={() => researchTopic(topic)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border font-medium transition-all",
                  selectedTopic === topic
                    ? "border-[#F97066] bg-[#F97066] text-white"
                    : "border-[#F5C4BC] bg-[#FEF0EA] text-[#C05040] hover:bg-[#FDDBD8]"
                )}>
                {topic.length > 44 ? topic.substring(0, 44) + "…" : topic}
              </button>
            ))}
            {customTopics.map((topic, i) => (
              <button key={`custom-${i}`}
                onClick={() => researchTopic(topic)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border font-medium transition-all",
                  selectedTopic === topic
                    ? "border-[#8B5CF6] bg-[#8B5CF6] text-white"
                    : "border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED] hover:bg-[#EDE9FE]"
                )}>
                {topic.length > 44 ? topic.substring(0, 44) + "…" : topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && addCustomTopic()}
          placeholder={allPills.length > 0 ? "＋ Add your own topic…" : "Enter a niche or topic (e.g. plant-based fitness)"}
          className="flex-1 text-sm h-9"
          style={{ borderColor: "#E5DDD5" }}
        />
        <Button
          onClick={addCustomTopic}
          disabled={loading || !customInput.trim()}
          size="sm"
          className="shrink-0 gap-1.5"
          style={{ backgroundColor: "#F97066", color: "white" }}>
          {loading && selectedTopic === customInput.trim()
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          Research
        </Button>
      </div>

      {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}

      {/* "Showing results for" label */}
      {selectedTopic && (loading || currentResult) && (
        <p className="text-xs" style={{ color: "#8A7060" }}>
          {loading ? "Researching " : "Showing results for "}
          <span className="font-semibold" style={{ color: "#2D1810" }}>
            {selectedTopic.length > 60 ? selectedTopic.substring(0, 60) + "…" : selectedTopic}
          </span>
          {loading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" style={{ color: "#F97066" }} />}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-x-auto -mx-5 px-5">
          <div className="grid grid-cols-5 gap-3 min-w-[900px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: "#F5F0EA" }} />
            ))}
          </div>
        </div>
      )}

      {/* 5-card horizontal layout */}
      {currentResult && !loading && (
        <div className="overflow-x-auto -mx-5 px-5">
          <div className="grid grid-cols-5 gap-3 min-w-[900px]">
            {categories.map(({ key, label, items }) => (
              <div key={key} className="rounded-xl border bg-[#FAFAF5] p-4 space-y-3"
                style={{ borderColor: "#E5DDD5" }}>
                <div className="flex items-center gap-1.5 pb-1 border-b" style={{ borderColor: "#F0EAE3" }}>
                  <span className="text-base leading-none">{NICHE_CATEGORY_ICONS[key]}</span>
                  <span className="text-xs font-bold leading-tight" style={{ color: "#2D1810" }}>{label}</span>
                </div>
                <ul className="space-y-2">
                  {items.slice(0, 5).map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 group">
                      <span className="text-[10px] font-bold mt-0.5 shrink-0" style={{ color: "#F97066" }}>→</span>
                      <span className="text-[11px] leading-relaxed flex-1" style={{ color: "#5A3828" }}>{item}</span>
                      {onSaveInsight && (key === "angles" || key === "pain" || key === "trending" || key === "gaps") && (
                        <button
                          onClick={() => onSaveInsight(item, "niche")}
                          title="Save to brief insights"
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                          style={{ color: "#F97066" }}>
                          <Bookmark className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedTopic && allPills.length === 0 && !loading && (
        <p className="text-xs" style={{ color: "#C4B5A5" }}>
          Enter any niche and Claude will analyse content angles, audience needs, trending topics, and gaps.
        </p>
      )}
    </div>
  )
}

// ── Research Strip (wrapper) ──────────────────────────────────────────────────

function ResearchStrip({
  brand,
  socialAccounts,
  userId,
  onSaveInsight,
}: {
  brand: Brand | null
  socialAccounts: Record<string, string>
  userId: string
  onSaveInsight?: (text: string, source: "opportunity" | "niche") => void
}) {
  const [opportunityResult, setOpportunityResult] = useState<ContentOpportunity | null>(null)

  return (
    <div className="space-y-6">
      <ContentOpportunityHero
        brand={brand}
        socialAccounts={socialAccounts}
        userId={userId}
        onOpportunityLoaded={setOpportunityResult}
        onSaveInsight={onSaveInsight ? (text, source) => onSaveInsight(text, source) : undefined}
      />
      <DualColumnAnalyser socialAccounts={socialAccounts} />
      <NicheResearch opportunityResult={opportunityResult} onSaveInsight={onSaveInsight ? (text, source) => onSaveInsight(text, source) : undefined} />
    </div>
  )
}


// ── Pillars Strip ─────────────────────────────────────────────────────────────

function PillarsStrip({ brand, initialPillars, onPillarsChange }: {
  brand: Brand | null
  initialPillars: ContentPillar[]
  onPillarsChange?: (pillars: ContentPillar[]) => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [savedPillars, setSavedPillars] = useState<ContentPillar[]>(initialPillars)
  const [expanded, setExpanded] = useState(false)
  const [niche, setNiche] = useState(brand?.niche ?? "")
  const [generated, setGenerated] = useState<GeneratedPillar[]>([])
  const [editedPillars, setEditedPillars] = useState<GeneratedPillar[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setEditedPillars(generated) }, [generated])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onPillarsChange?.(savedPillars) }, [savedPillars])

  const updateField = (
    index: number,
    field: keyof Pick<GeneratedPillar, "name" | "emoji" | "description" | "voice_direction" | "format_preference">,
    value: string
  ) => {
    setEditedPillars((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const generate = async () => {
    const trimmed = niche.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setGenerated([])
    try {
      const res = await fetch("/api/generate-pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed")
      setGenerated(data.pillars)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const savePillars = async () => {
    if (!brand?.id || editedPillars.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast({ title: "Not logged in", variant: "destructive" }); setSaving(false); return }
    const inserts = editedPillars.map((p, i) => ({
      brand_id: brand.id,
      user_id: user.id,
      name: p.name.trim(),
      emoji: p.emoji || "📌",
      description: p.description || null,
      voice_direction: p.voice_direction || null,
      format_preference: p.format_preference || "any",
      weekly_quota: 2,
      color: PILLAR_COLORS[i % PILLAR_COLORS.length],
      sort_order: savedPillars.length + i,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: dbError } = await supabase.from("content_pillars").insert(inserts as any).select()
    if (dbError) {
      toast({ title: "Failed to save pillars", description: dbError.message, variant: "destructive" })
    } else {
      setSavedPillars((prev) => [...prev, ...(inserted ?? [])])
      setGenerated([])
      setExpanded(false)
      toast({ title: `${editedPillars.length} pillars saved!` })
    }
    setSaving(false)
  }

  const deletePillar = async (pillarId: string) => {
    const { error } = await supabase.from("content_pillars").delete().eq("id", pillarId)
    if (error) { toast({ title: "Failed to delete", variant: "destructive" }) }
    else {
      setSavedPillars((prev) => prev.filter((p) => p.id !== pillarId))
      toast({ title: "Pillar deleted" })
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-3"
      style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>

      {/* Top row: header + pills + button */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
            <Layers className="h-3.5 w-3.5" style={{ color: "#D4432A" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Content Pillars</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {savedPillars.length > 0 ? (
            savedPillars.map((pillar) => (
              <div key={pillar.id}
                className="group flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium shrink-0"
                style={{ backgroundColor: pillar.color + "18", color: pillar.color, borderColor: pillar.color + "45" }}>
                <span>{pillar.name}</span>
                <button onClick={() => deletePillar(pillar.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shrink-0">
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))
          ) : (
            !expanded && (
              <span className="text-xs" style={{ color: "#C4B5A5" }}>No pillars yet — generate some below</span>
            )
          )}
        </div>

        <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}
          className="gap-1.5 h-7 text-xs shrink-0"
          style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
          {expanded
            ? <ChevronUp className="h-3 w-3" />
            : <Plus className="h-3 w-3" />}
          {expanded ? "Collapse" : "Generate Pillars"}
        </Button>
      </div>

      {/* Expandable panel */}
      {expanded && (
        <div className="space-y-4 pt-3 border-t" style={{ borderColor: "#F0EAE3" }}>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your niche (e.g. sustainable fashion, fitness for mums)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
              className="flex-1 text-sm"
              style={{ borderColor: "#E5DDD5" }}
            />
            <Button onClick={generate} disabled={loading || !niche.trim()} size="sm"
              className="gap-1.5 shrink-0" style={{ backgroundColor: "#F97066", color: "white" }}>
              {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? "Generating…" : "Generate Pillars"}
            </Button>
          </div>

          {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "#F5F0EA" }} />
              ))}
            </div>
          )}

          {editedPillars.length > 0 && !loading && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {editedPillars.map((pillar, i) => (
                  <div key={i} className="rounded-xl border p-3 space-y-2 bg-white"
                    style={{ borderColor: "#E5DDD5" }}>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={pillar.emoji}
                        onChange={(e) => updateField(i, "emoji", e.target.value)}
                        className="text-xl w-8 bg-transparent border-none outline-none cursor-text"
                        maxLength={2}
                        aria-label="Pillar emoji"
                      />
                      <input
                        value={pillar.name}
                        onChange={(e) => updateField(i, "name", e.target.value)}
                        className="flex-1 text-xs font-bold bg-transparent border-none outline-none focus:bg-[#F5F0EA] rounded px-1 py-0.5"
                        style={{ color: "#2D1810" }}
                        aria-label="Pillar name"
                      />
                    </div>
                    <textarea
                      value={pillar.description}
                      onChange={(e) => updateField(i, "description", e.target.value)}
                      className="w-full text-[10px] leading-relaxed bg-transparent border border-[#E5DDD5] rounded-lg px-2 py-1 resize-none focus:outline-none focus:border-[#F97066]"
                      style={{ color: "#8A7060" }}
                      rows={2}
                      aria-label="Pillar description"
                    />
                    {pillar.voice_direction && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Voice</span>
                        <textarea
                          value={pillar.voice_direction}
                          onChange={(e) => updateField(i, "voice_direction", e.target.value)}
                          className="w-full text-[10px] leading-relaxed bg-transparent border border-[#E5DDD5] rounded-lg px-2 py-1 resize-none focus:outline-none focus:border-[#F97066]"
                          style={{ color: "#5A3828" }}
                          rows={2}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Best Format</span>
                      <select
                        value={pillar.format_preference ?? "any"}
                        onChange={(e) => updateField(i, "format_preference", e.target.value)}
                        className="w-full text-[10px] rounded-lg border px-2 h-7"
                        style={{ borderColor: "#E5DDD5", color: "#2D1810" }}>
                        {["any", "post", "carousel", "reel"].map((f) => (
                          <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={generate}
                  className="gap-1.5 h-7 text-xs" style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </Button>
                {brand?.id ? (
                  <Button size="sm" onClick={savePillars} disabled={saving}
                    className="gap-1.5 h-7 text-xs" style={{ backgroundColor: "#F97066", color: "white" }}>
                    {saving
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Save className="h-3 w-3" />}
                    {saving ? "Saving…" : "Save Pillars"}
                  </Button>
                ) : (
                  <p className="text-xs" style={{ color: "#8A7060" }}>
                    <a href="/brands/new" className="underline" style={{ color: "#F97066" }}>Create a brand</a> to save pillars.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Saved Insights helpers ────────────────────────────────────────────────────

function useSavedInsights(userId: string) {
  const key = `${LS_SAVED_INSIGHTS_KEY_PREFIX}-${userId}`
  const [insights, setInsights] = useState<SavedInsight[]>(() => lsGet<SavedInsight[]>(key) ?? [])

  const save = useCallback((text: string, source: "opportunity" | "niche" | "analyser") => {
    setInsights((prev) => {
      const already = prev.some((i) => i.text === text)
      if (already) return prev
      const newItem: SavedInsight = { id: `${Date.now()}`, text, source, savedAt: Date.now() }
      const updated = [newItem, ...prev].slice(0, MAX_SAVED_INSIGHTS)
      lsSet(key, updated)
      return updated
    })
  }, [key])

  const remove = useCallback((id: string) => {
    setInsights((prev) => {
      const updated = prev.filter((i) => i.id !== id)
      lsSet(key, updated)
      return updated
    })
  }, [key])

  return { insights, save, remove }
}

// ── Ideas Bank Component ──────────────────────────────────────────────────────

const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  post: { bg: "#F0FDF4", text: "#16A34A" },
  carousel: { bg: "#F0F4FF", text: "#5B6AC4" },
  reel: { bg: "#FEF0EA", text: "#D4432A" },
}

function IdeasBank({
  ideas,
  pillars,
  onLoad,
  onDelete,
  onRefresh,
}: {
  ideas: Idea[]
  pillars: ContentPillar[]
  onLoad: (idea: Idea) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Group ideas by pillar
  const grouped: Record<string, Idea[]> = { none: [] }
  pillars.forEach((p) => { grouped[p.id] = [] })
  ideas.forEach((idea) => {
    const key = idea.pillar_id && grouped[idea.pillar_id] !== undefined ? idea.pillar_id : "none"
    grouped[key].push(idea)
  })

  const totalCount = ideas.length

  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAF5] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
            <Bookmark className="h-3.5 w-3.5" style={{ color: "#D4432A" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>
            Ideas Bank
          </span>
          {totalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#FEF0EA", color: "#D4432A" }}>
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh() }}
            className="p-1 rounded-lg hover:bg-[#F5F0EA] transition-colors"
            title="Refresh ideas"
          >
            <RefreshCw className="h-3.5 w-3.5" style={{ color: "#8A7060" }} />
          </button>
          {open ? <ChevronUp className="h-4 w-4" style={{ color: "#8A7060" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#8A7060" }} />}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: "#E5DDD5" }}>
          {ideas.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bookmark className="h-8 w-8 mx-auto" style={{ color: "#C4B5A5" }} />
              <p className="text-sm" style={{ color: "#8A7060" }}>No saved ideas yet</p>
              <p className="text-xs" style={{ color: "#C4B5A5" }}>Generate content above and save your favourites</p>
            </div>
          ) : (
            Object.entries(grouped).map(([pillarId, pillarIdeas]) => {
              if (pillarIdeas.length === 0) return null
              const pillar = pillars.find((p) => p.id === pillarId)
              return (
                <div key={pillarId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{pillar?.emoji || "💡"}</span>
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#8A7060" }}>
                      {pillar?.name || "Unsorted"}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: "#E5DDD5" }} />
                  </div>
                  {pillarIdeas.map((idea) => {
                    const fmt = FORMAT_COLORS[idea.format] || FORMAT_COLORS.post
                    return (
                      <div
                        key={idea.id}
                        className="rounded-xl border p-3 space-y-2 group"
                        style={{ borderColor: "#E5DDD5", backgroundColor: "#FAFAF5" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: fmt.bg, color: fmt.text }}>
                            {idea.format}
                          </span>
                          <span className="text-[10px]" style={{ color: "#C4B5A5" }}>
                            {new Date(idea.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "#2D1810" }}>
                          {idea.hook || idea.title || "Untitled idea"}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onLoad(idea)}
                            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all hover:-translate-y-0.5"
                            style={{ backgroundColor: "#F97066", color: "white" }}
                          >
                            Load
                          </button>
                          {confirmDelete === idea.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { onDelete(idea.id); setConfirmDelete(null) }}
                                className="text-xs px-2 py-1.5 rounded-lg"
                                style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs px-2 py-1.5 rounded-lg"
                                style={{ backgroundColor: "#F5F0EA", color: "#7A5C50" }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(idea.id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-[#FEE2E2]"
                              title="Delete idea"
                            >
                              <Trash2 className="h-3.5 w-3.5" style={{ color: "#C4B5A5" }} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Generation Strip (new pillar-first 3-step flow) ───────────────────────────

function GenerationStrip({
  brand,
  pillars,
  savedInsights,
  userId,
  loadedIdea,
  onIdeaSaved,
}: {
  brand: Brand
  pillars: ContentPillar[]
  savedInsights: SavedInsight[]
  userId: string
  loadedIdea?: Idea | null
  onIdeaSaved?: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  // ── Step state ──────────────────────────────────────────────────────────
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | null>(null)
  const [topic, setTopic] = useState("")
  const [keyMessage, setKeyMessage] = useState("")
  const [suggestingKeyMessage, setSuggestingKeyMessage] = useState(false)

  // ── Step 2 → 3 ──────────────────────────────────────────────────────────
  const [generatingHooks, setGeneratingHooks] = useState(false)
  const [hooks, setHooks] = useState<string[]>([])
  const [formatRecommendation, setFormatRecommendation] = useState<FormatRecommendation | null>(null)
  const [selectedHookIdx, setSelectedHookIdx] = useState<number | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<"Post" | "Carousel" | "Reel" | null>(null)

  // ── POST state ──────────────────────────────────────────────────────────
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [caption, setCaption] = useState("")
  const [generatingHashtags, setGeneratingHashtags] = useState(false)
  const [hashtags, setHashtags] = useState<HashtagGroups | null>(null)
  const [activeHashtags, setActiveHashtags] = useState<HashtagGroups | null>(null)
  const [generatingAltText, setGeneratingAltText] = useState(false)
  const [altTextInput, setAltTextInput] = useState("")
  const [altText, setAltText] = useState("")
  const [postImagePrompt, setPostImagePrompt] = useState("")
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null)
  const [postImageLoaded, setPostImageLoaded] = useState(false)
  const [postImageError, setPostImageError] = useState(false)

  // ── CAROUSEL state ──────────────────────────────────────────────────────
  const [slideCount, setSlideCount] = useState(5)
  const [generatingCarousel, setGeneratingCarousel] = useState(false)
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0)
  const [coverImagePrompt, setCoverImagePrompt] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverImageLoaded, setCoverImageLoaded] = useState(false)
  const [coverImageError, setCoverImageError] = useState(false)

  // ── REEL state ──────────────────────────────────────────────────────────
  const [reelDuration, setReelDuration] = useState<"15s" | "30s" | "60s" | "90s">("30s")
  const [generatingReel, setGeneratingReel] = useState(false)
  const [reelScript, setReelScript] = useState<ReelScript | null>(null)
  const [generatingReelCaption, setGeneratingReelCaption] = useState(false)
  const [reelCaption, setReelCaption] = useState<{ caption: string; hashtags: HashtagGroups } | null>(null)
  const [reelCaptionHashtags, setReelCaptionHashtags] = useState<HashtagGroups | null>(null)

  // ── Saving ──────────────────────────────────────────────────────────────
  const [savingToPlanner, setSavingToPlanner] = useState(false)
  const [savingIdea, setSavingIdea] = useState(false)
  const [savedIdeaId, setSavedIdeaId] = useState<string | null>(null)

  // ── Reset when pillar changes ────────────────────────────────────────────
  const resetGeneration = () => {
    setTopic("")
    setKeyMessage("")
    setHooks([])
    setFormatRecommendation(null)
    setSelectedHookIdx(null)
    setSelectedFormat(null)
    setCaption("")
    setHashtags(null)
    setActiveHashtags(null)
    setAltText("")
    setSlides([])
    setReelScript(null)
    setReelCaption(null)
  }

  // ── Auto-fills ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (caption && !postImagePrompt) {
      const suggestion = caption.split(/[.\n]/)[0]?.trim().substring(0, 80) ?? ""
      if (suggestion) setPostImagePrompt(suggestion)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption])

  useEffect(() => {
    if (topic && !coverImagePrompt) setCoverImagePrompt(topic.substring(0, 80))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])

  useEffect(() => {
    if (hashtags) setActiveHashtags(hashtags)
  }, [hashtags])

  useEffect(() => {
    if (reelCaption) setReelCaptionHashtags(reelCaption.hashtags)
  }, [reelCaption])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const brandCtx = useCallback(() => ({
    brandName: brand?.name,
    niche: brand?.niche,
    tone: brand?.tone_of_voice ?? undefined,
    targetAudience: brand?.target_audience ?? undefined,
  }), [brand])

  const pillarCtx = useCallback(() => ({
    pillarName: selectedPillar?.name ?? undefined,
    pillarVoiceDirection: selectedPillar?.voice_direction ?? undefined,
    pillarFormatPreference: selectedPillar?.format_preference ?? undefined,
  }), [selectedPillar])

  const showError = (err: unknown) => toast({
    title: "Generation failed",
    description: err instanceof Error ? err.message : "Check your ANTHROPIC_API_KEY in .env.local",
    variant: "destructive",
  })

  async function callApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? "Request failed")
    return data as T
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSuggestKeyMessage = async () => {
    if (!topic.trim()) return
    setSuggestingKeyMessage(true)
    try {
      const data = await callApi<{ keyMessage: string }>("/api/generate-key-message", {
        topic, ...brandCtx(), ...pillarCtx(),
      })
      setKeyMessage(data.keyMessage ?? "")
    } catch (err) { showError(err) }
    setSuggestingKeyMessage(false)
  }

  const handleGenerateIdeas = async () => {
    if (!topic.trim()) return
    setGeneratingHooks(true)
    setHooks([])
    setFormatRecommendation(null)
    setSelectedHookIdx(null)
    setSelectedFormat(null)
    setCaption("")
    setHashtags(null)
    setActiveHashtags(null)
    setSlides([])
    setReelScript(null)
    try {
      const data = await callApi<{ hooks: string[]; formatRecommendation: FormatRecommendation | null }>(
        "/api/generate-hooks",
        { topic, keyMessage: keyMessage || undefined, ...brandCtx(), ...pillarCtx() }
      )
      setHooks(data.hooks ?? [])
      if (data.formatRecommendation) {
        setFormatRecommendation(data.formatRecommendation)
        setSelectedFormat(data.formatRecommendation.format as "Post" | "Carousel" | "Reel")
      }
    } catch (err) { showError(err) }
    setGeneratingHooks(false)
  }

  const handleGenerateCaption = async () => {
    const selectedHook = selectedHookIdx !== null ? hooks[selectedHookIdx] : ""
    setGeneratingCaption(true)
    setCaption("")
    try {
      const data = await callApi<{ caption: string }>("/api/generate-caption", {
        hook: selectedHook || topic,
        notes: keyMessage ? `Key message to convey: ${keyMessage}` : undefined,
        ...brandCtx(),
      })
      setCaption(data.caption ?? "")
    } catch (err) { showError(err) }
    setGeneratingCaption(false)
  }

  const handleGenerateHashtags = async () => {
    setGeneratingHashtags(true)
    setHashtags(null)
    try {
      const data = await callApi<HashtagGroups>("/api/generate-hashtags", { niche: brand?.niche, caption, brandName: brand?.name })
      setHashtags(data)
    } catch (err) { showError(err) }
    setGeneratingHashtags(false)
  }

  const handleGenerateAltText = async () => {
    if (!altTextInput.trim()) return
    setGeneratingAltText(true)
    setAltText("")
    try {
      const data = await callApi<{ altText: string }>("/api/generate-alt-text", { imageDescription: altTextInput, brandName: brand?.name, niche: brand?.niche })
      setAltText(data.altText ?? "")
    } catch (err) { showError(err) }
    setGeneratingAltText(false)
  }

  const handleGeneratePostImage = () => {
    if (!postImagePrompt.trim()) return
    const seed = Math.floor(Math.random() * 99999)
    setPostImageLoaded(false); setPostImageError(false)
    setPostImageUrl(buildPollinationsUrl(postImagePrompt, brand?.niche, seed))
  }

  const handleRegeneratePostImage = () => {
    if (!postImagePrompt.trim() || !postImageUrl) return
    const seed = Math.floor(Math.random() * 99999)
    setPostImageLoaded(false); setPostImageError(false)
    setPostImageUrl(buildPollinationsUrl(postImagePrompt, brand?.niche, seed))
  }

  const handleGenerateCarousel = async () => {
    setGeneratingCarousel(true); setSlides([]); setPreviewSlideIdx(0)
    try {
      const data = await callApi<{ slides: CarouselSlide[] }>("/api/generate-carousel", { topic, slideCount, ...brandCtx() })
      setSlides(data.slides ?? [])
    } catch (err) { showError(err) }
    setGeneratingCarousel(false)
  }

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const newSlides = [...slides]
    const target = idx + dir
    if (target < 0 || target >= newSlides.length) return
    ;[newSlides[idx], newSlides[target]] = [newSlides[target], newSlides[idx]]
    setSlides(newSlides)
    if (previewSlideIdx === idx) setPreviewSlideIdx(target)
  }

  const updateSlideField = (idx: number, field: keyof CarouselSlide, value: string | string[]) => {
    setSlides((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const handleExportOutline = () => {
    if (!slides.length) return
    const lines: string[] = [`CAROUSEL: ${topic}\n`]
    slides.forEach((s, i) => {
      lines.push(`SLIDE ${i + 1} [${s.type.toUpperCase()}]`)
      lines.push(`Title: ${s.title}`)
      if (s.type === "cover" && s.hook) lines.push(`Hook: ${s.hook}`)
      if (s.type === "content" && s.bullets) s.bullets.forEach((b) => lines.push(`  • ${b}`))
      if (s.type === "cta" && s.cta) lines.push(`CTA: ${s.cta}`)
      lines.push("")
    })
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {})
    toast({ title: "Carousel outline copied to clipboard!" })
  }

  const handleGenerateCoverImage = () => {
    if (!coverImagePrompt.trim()) return
    const seed = Math.floor(Math.random() * 99999)
    setCoverImageLoaded(false); setCoverImageError(false)
    setCoverImageUrl(buildPollinationsUrl(coverImagePrompt, brand?.niche, seed))
  }

  const handleRegenerateCoverImage = () => {
    if (!coverImagePrompt.trim() || !coverImageUrl) return
    const seed = Math.floor(Math.random() * 99999)
    setCoverImageLoaded(false); setCoverImageError(false)
    setCoverImageUrl(buildPollinationsUrl(coverImagePrompt, brand?.niche, seed))
  }

  const handleGenerateReel = async () => {
    setGeneratingReel(true); setReelScript(null); setReelCaption(null); setReelCaptionHashtags(null)
    try {
      const data = await callApi<ReelScript>("/api/generate-reel", { concept: topic, duration: reelDuration, ...brandCtx() })
      setReelScript(data)
    } catch (err) { showError(err) }
    setGeneratingReel(false)
  }

  const handleGenerateReelCaption = async () => {
    const hook = selectedHookIdx !== null ? hooks[selectedHookIdx] : reelScript?.hook ?? topic
    setGeneratingReelCaption(true); setReelCaption(null)
    try {
      const [captionData, hashtagData] = await Promise.all([
        callApi<{ caption: string }>("/api/generate-caption", { hook, notes: `Reel about: ${topic}`, ...brandCtx() }),
        callApi<HashtagGroups>("/api/generate-hashtags", { niche: brand?.niche, caption: hook, brandName: brand?.name }),
      ])
      setReelCaption({ caption: captionData.caption ?? "", hashtags: hashtagData })
    } catch (err) { showError(err) }
    setGeneratingReelCaption(false)
  }

  // ── Save to Planner ───────────────────────────────────────────────────────
  const handleSavePost = async () => {
    if (!caption) return
    setSavingToPlanner(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const allHashtags = activeHashtags ? [...activeHashtags.niche, ...activeHashtags.broad, ...activeHashtags.engagement].join(" ") : ""
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("posts") as any).insert({
        brand_id: brand.id, user_id: user!.id, platform: "instagram", format: "static",
        caption_draft: caption, hashtags: allHashtags || null,
        media_url: postImageUrl || null,
        pillar_id: selectedPillar?.id ?? null, status: "draft",
      })
      if (error) throw new Error(error.message)
      toast({ title: "Saved to planner!", description: "Post added as draft." })
    } catch (err) { showError(err) }
    setSavingToPlanner(false)
  }

  const handleSaveCarousel = async () => {
    if (!slides.length) return
    setSavingToPlanner(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("posts") as any).insert({
        brand_id: brand.id, user_id: user!.id, platform: "instagram", format: "carousel",
        caption_draft: topic, notes: JSON.stringify({ slides }),
        pillar_id: selectedPillar?.id ?? null, status: "draft",
      })
      if (error) throw new Error(error.message)
      toast({ title: "Carousel saved to planner!" })
    } catch (err) { showError(err) }
    setSavingToPlanner(false)
  }

  const handleSaveReel = async () => {
    if (!reelScript) return
    setSavingToPlanner(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("posts") as any).insert({
        brand_id: brand.id, user_id: user!.id, platform: "instagram", format: "reel",
        caption_draft: topic, notes: JSON.stringify(reelScript),
        pillar_id: selectedPillar?.id ?? null, status: "draft",
      })
      if (error) throw new Error(error.message)
      toast({ title: "Reel script saved to planner!" })
    } catch (err) { showError(err) }
    setSavingToPlanner(false)
  }

  // ── Save Idea ─────────────────────────────────────────────────────────────
  const handleSaveIdea = async () => {
    if (!brand) return
    setSavingIdea(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const selectedHook = selectedHookIdx !== null ? hooks[selectedHookIdx] : ""
      const allHashStr = activeHashtags
        ? [...activeHashtags.niche, ...activeHashtags.broad, ...activeHashtags.engagement].join(" ")
        : reelCaptionHashtags
        ? [...reelCaptionHashtags.niche, ...reelCaptionHashtags.broad, ...reelCaptionHashtags.engagement].join(" ")
        : ""

      const payload = {
        user_id: user!.id,
        brand_id: brand.id,
        pillar_id: selectedPillar?.id ?? null,
        format: (selectedFormat?.toLowerCase() ?? "post") as "post" | "carousel" | "reel",
        title: topic.substring(0, 120) || "Untitled",
        hook: selectedHook || null,
        caption: caption || reelCaption?.caption || null,
        hashtags: allHashStr || null,
        slides: slides.length > 0 ? (slides as unknown as Record<string, unknown>[]) : null,
        script: reelScript ? (reelScript as unknown as Record<string, unknown>) : null,
        media_url: postImageUrl || coverImageUrl || null,
        status: "idea" as const,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("ideas") as any).insert(payload).select().single()
      if (error) throw new Error(error.message)
      setSavedIdeaId(data?.id ?? "saved")
      toast({ title: "💾 Idea saved to your Ideas Bank" })
      onIdeaSaved?.()
    } catch (err) { showError(err) }
    setSavingIdea(false)
  }

  // Reset savedIdeaId when content changes
  useEffect(() => { setSavedIdeaId(null) }, [topic, caption, slides, reelScript, selectedHookIdx])

  // Pre-populate from loaded idea
  useEffect(() => {
    if (!loadedIdea) return
    setTopic(loadedIdea.title ?? "")
    setCaption(loadedIdea.caption ?? "")
    if (loadedIdea.hook) setHooks([loadedIdea.hook])
    if (loadedIdea.slides) setSlides(loadedIdea.slides as unknown as CarouselSlide[])
    if (loadedIdea.script) setReelScript(loadedIdea.script as unknown as ReelScript)
    if (loadedIdea.format === "post") setSelectedFormat("Post")
    else if (loadedIdea.format === "carousel") setSelectedFormat("Carousel")
    else if (loadedIdea.format === "reel") setSelectedFormat("Reel")
    const matchedPillar = pillars.find(p => p.id === loadedIdea.pillar_id)
    if (matchedPillar) setSelectedPillar(matchedPillar)
    setSavedIdeaId(loadedIdea.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedIdea])

  // ── Derived ───────────────────────────────────────────────────────────────
  const allHashtagsStr = activeHashtags
    ? [...activeHashtags.niche, ...activeHashtags.broad, ...activeHashtags.engagement].join(" ")
    : ""

  const hasHooks = hooks.length > 0
  const hasSelectedHook = selectedHookIdx !== null
  const hasFormat = selectedFormat !== null
  const step2Ready = selectedPillar !== null
  const step3Ready = step2Ready && hasHooks
  const step4Ready = step3Ready && hasSelectedHook && hasFormat

  // ── Format colors ─────────────────────────────────────────────────────────
  const fmtColor = (fmt: string) => {
    if (fmt === "Post") return { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" }
    if (fmt === "Carousel") return { bg: "#F0F4FF", text: "#5B6AC4", border: "#C7D2FE" }
    return { bg: "#FEF0EA", text: "#D4432A", border: "#F5C4BC" }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── STEP 1: Pick Your Pillar ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#F97066" }}>1</div>
          <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Pick your pillar</span>
        </div>

        {pillars.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center space-y-2" style={{ borderColor: "#E5DDD5" }}>
            <Layers className="h-8 w-8 mx-auto" style={{ color: "#C4B5A5" }} />
            <p className="text-sm font-medium" style={{ color: "#8A7060" }}>Generate your content pillars above first</p>
            <p className="text-xs" style={{ color: "#C4B5A5" }}>They'll appear here as selectable cards</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {pillars.map((pillar) => {
              const isSelected = selectedPillar?.id === pillar.id
              const pillarColor = pillar.color || "#F97066"
              const fmtPref = pillar.format_preference
              return (
                <button key={pillar.id}
                  onClick={() => {
                    if (isSelected) { setSelectedPillar(null); resetGeneration() }
                    else { setSelectedPillar(pillar); resetGeneration() }
                  }}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left space-y-2 transition-all duration-200 ease-in-out",
                    isSelected ? "shadow-md" : "hover:shadow-sm hover:-translate-y-0.5"
                  )}
                  style={{
                    borderColor: isSelected ? "#F97066" : "#E5DDD5",
                    backgroundColor: isSelected ? "#FEF6F4" : "white",
                  }}>
                  <div className="text-2xl leading-none">{pillar.emoji || "📌"}</div>
                  <div>
                    <p className="text-xs font-bold leading-tight" style={{ color: "#2D1810" }}>{pillar.name}</p>
                    {fmtPref && fmtPref !== "any" && (
                      <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ ...fmtColor(fmtPref.charAt(0).toUpperCase() + fmtPref.slice(1)) }}>
                        {fmtPref}
                      </span>
                    )}
                  </div>
                  {pillar.voice_direction && (
                    <p className="text-[10px] leading-snug line-clamp-2" style={{ color: "#8A7060" }}>
                      {pillar.voice_direction}
                    </p>
                  )}
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#F97066" }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── STEP 2: Brief ── */}
      <div className={cn(
        "space-y-4 transition-all duration-300 ease-in-out",
        step2Ready ? "opacity-100" : "opacity-40 pointer-events-none"
      )}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: step2Ready ? "#F97066" : "#C4B5A5" }}>2</div>
          <span className="text-sm font-semibold" style={{ color: step2Ready ? "#2D1810" : "#A07060" }}>
            {selectedPillar ? `Brief for ${selectedPillar.emoji || ""} ${selectedPillar.name}` : "Write your brief"}
          </span>
        </div>

        {step2Ready && (
          <div className="rounded-2xl border bg-white p-5 space-y-5" style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}>
            {/* Field 1: Topic */}
            <div className="space-y-2">
              <label className="text-xs font-semibold" style={{ color: "#2D1810" }}>Topic / Angle <span style={{ color: "#F97066" }}>*</span></label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The morning routine nobody talks about"
                className="w-full text-sm rounded-xl border px-4 py-3 outline-none transition-colors focus:border-[#F97066]"
                style={{ borderColor: "#E5DDD5", color: "#2D1810" }}
              />
              {/* Saved insights pills */}
              {savedInsights.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A07060" }}>
                    Your saved insights — click to use:
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {savedInsights.map((insight) => (
                      <button key={insight.id}
                        onClick={() => setTopic(insight.text)}
                        className={cn(
                          "text-xs px-3 py-1 rounded-full border font-medium transition-all hover:-translate-y-0.5",
                          topic === insight.text
                            ? "border-[#F97066] bg-[#FEF0EA] text-[#C05040]"
                            : "border-[#E5DDD5] bg-[#FAFAF5] text-[#7A5C50] hover:border-[#F97066]/50"
                        )}>
                        <BookmarkCheck className="h-2.5 w-2.5 inline mr-1" style={{ color: "#F97066" }} />
                        {insight.text.length > 40 ? insight.text.substring(0, 40) + "…" : insight.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field 2: Key message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: "#2D1810" }}>
                  Key message <span className="font-normal" style={{ color: "#A07060" }}>(optional)</span>
                </label>
                <button
                  onClick={handleSuggestKeyMessage}
                  disabled={!topic.trim() || suggestingKeyMessage}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all disabled:opacity-40 hover:bg-[#FEF0EA]"
                  style={{ borderColor: "#F5C4BC", color: "#C05040" }}>
                  {suggestingKeyMessage
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Zap className="h-3 w-3" />}
                  Suggest
                </button>
              </div>
              <input
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="What's the one thing you want them to take away?"
                className="w-full text-sm rounded-xl border px-4 py-3 outline-none transition-colors focus:border-[#F97066]"
                style={{ borderColor: "#E5DDD5", color: "#2D1810" }}
              />
            </div>

            {/* Generate Ideas CTA */}
            <button
              onClick={handleGenerateIdeas}
              disabled={!topic.trim() || generatingHooks}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all",
                topic.trim() && !generatingHooks
                  ? "hover:-translate-y-0.5 hover:shadow-md"
                  : "opacity-50 cursor-not-allowed"
              )}
              style={{ backgroundColor: "#F97066", color: "white" }}>
              {generatingHooks
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating ideas…</>
                : <><Sparkles className="h-4 w-4" /> Generate Ideas</>}
            </button>
          </div>
        )}
      </div>

      {/* ── STEP 3: Pick hook + format ── */}
      {step3Ready && (
        <div className="space-y-4 transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#F97066" }}>3</div>
            <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Pick your hook</span>
          </div>

          <div className="space-y-3">
            {/* Format recommendation */}
            {formatRecommendation && (
              <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
                style={{ ...fmtColor(formatRecommendation.format), borderColor: fmtColor(formatRecommendation.format).border }}>
                <Zap className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Best as a {formatRecommendation.format}</p>
                  <p className="text-xs mt-0.5 opacity-80">{formatRecommendation.reasoning}</p>
                </div>
              </div>
            )}

            {/* Hook cards */}
            {hooks.map((hook, i) => (
              <button key={i}
                onClick={() => setSelectedHookIdx(i === selectedHookIdx ? null : i)}
                className={cn(
                  "w-full text-left text-sm px-4 py-3.5 rounded-xl border-2 transition-all duration-200",
                  selectedHookIdx === i
                    ? "border-[#F97066] bg-[#FEF6F4]"
                    : "border-[#E5DDD5] bg-white hover:border-[#F97066]/40 hover:bg-[#FEFCF8]"
                )}
                style={{ color: "#2D1810" }}>
                <div className="flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: selectedHookIdx === i ? "#F97066" : "#F5F0EA", color: selectedHookIdx === i ? "white" : "#8A7060" }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{hook}</span>
                  {selectedHookIdx === i && (
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#F97066" }} />
                  )}
                </div>
              </button>
            ))}

            {/* Format picker */}
            <div className="pt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>Develop as:</p>
              <div className="flex gap-2">
                {(["Post", "Carousel", "Reel"] as const).map((fmt) => {
                  const { bg, text, border } = fmtColor(fmt)
                  const isRec = formatRecommendation?.format === fmt
                  const isSelected = selectedFormat === fmt
                  return (
                    <button key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-200 relative",
                        isSelected ? "shadow-sm" : "hover:shadow-sm"
                      )}
                      style={{ borderColor: isSelected ? "#F97066" : border, backgroundColor: isSelected ? "#FEF6F4" : bg }}>
                      {isRec && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#F97066", color: "white" }}>
                          Recommended
                        </span>
                      )}
                      {fmt === "Post" && <Type className="h-4 w-4" style={{ color: isSelected ? "#F97066" : text }} />}
                      {fmt === "Carousel" && <LayoutGrid className="h-4 w-4" style={{ color: isSelected ? "#F97066" : text }} />}
                      {fmt === "Reel" && <Film className="h-4 w-4" style={{ color: isSelected ? "#F97066" : text }} />}
                      <span className="text-xs font-semibold" style={{ color: isSelected ? "#F97066" : text }}>{fmt}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Develop ── */}
      {step4Ready && (
        <div className="space-y-4 transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#F97066" }}>4</div>
              <span className="text-sm font-semibold" style={{ color: "#2D1810" }}>Develop your {selectedFormat}</span>
            </div>
            <button
              onClick={() => { setSelectedHookIdx(null); setSelectedFormat(null); setCaption(""); setHashtags(null); setSlides([]); setReelScript(null) }}
              className="flex items-center gap-1 text-xs" style={{ color: "#A07060" }}>
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>

          {/* ── POST ── */}
          {selectedFormat === "Post" && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3 space-y-5">
                {/* Selected hook display */}
                {selectedHookIdx !== null && (
                  <div className="rounded-xl border px-4 py-3" style={{ borderColor: "#F5C4BC", backgroundColor: "#FEF6F4" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#A07060" }}>Your hook</p>
                    <p className="text-sm font-medium" style={{ color: "#2D1810" }}>{hooks[selectedHookIdx]}</p>
                  </div>
                )}

                {/* Caption */}
                <SectionCard title="Caption" icon={<AlignLeft className="h-3.5 w-3.5" />}>
                  <div className="space-y-3">
                    <button
                      onClick={handleGenerateCaption}
                      disabled={generatingCaption}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ backgroundColor: "#F97066", color: "white" }}>
                      {generatingCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generatingCaption ? "Writing…" : "Generate Caption"}
                    </button>
                    {(caption || generatingCaption) && (
                      <div className="rounded-xl border space-y-2 p-4" style={{ borderColor: "#E5DDD5" }}>
                        {generatingCaption ? (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "#8A7060" }}>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#F97066" }} />
                            Writing your caption…
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold" style={{ color: "#8A7060" }}>CAPTION</span>
                              <CopyButton text={caption} />
                            </div>
                            <textarea
                              value={caption}
                              onChange={(e) => setCaption(e.target.value)}
                              rows={6}
                              className="w-full text-sm rounded-lg border px-3 py-2 resize-none outline-none focus:border-[#F97066]"
                              style={{ borderColor: "#E5DDD5", color: "#2D1810" }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Hashtags */}
                <SectionCard title="Hashtags" icon={<Hash className="h-3.5 w-3.5" />}>
                  <div className="space-y-3">
                    <button
                      onClick={handleGenerateHashtags}
                      disabled={generatingHashtags}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ backgroundColor: "#F97066", color: "white" }}>
                      {generatingHashtags ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                      {generatingHashtags ? "Generating…" : "Generate Hashtags"}
                    </button>
                    {activeHashtags && (
                      <div className="space-y-3">
                        {(["niche", "broad", "engagement"] as const).map((grp) => {
                          const colors = grp === "niche"
                            ? { bg: "#FEF0EA", text: "#D4432A" }
                            : grp === "broad"
                            ? { bg: "#F0F4FF", text: "#5B6AC4" }
                            : { bg: "#F0FDF4", text: "#16A34A" }
                          return (
                            <div key={grp} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold capitalize" style={{ color: "#2D1810" }}>{grp}</span>
                                <CopyButton text={activeHashtags[grp].join(" ")} />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {activeHashtags[grp].map((tag) => (
                                  <button key={tag}
                                    onClick={() => setActiveHashtags((prev) => prev ? {
                                      ...prev,
                                      [grp]: prev[grp].filter((t) => t !== tag),
                                    } : prev)}
                                    className="text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:opacity-60"
                                    style={{ backgroundColor: colors.bg, color: colors.text }}>
                                    {tag} ×
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                        <CopyButton text={allHashtagsStr} label="Copy all hashtags" />
                        {caption && (
                          <CanvaButton
                            label="Finish in Canva"
                            onClick={() => {
                              const msg = openInCanva({ title: topic, caption, hashtags: allHashtagsStr, format: 'post' })
                              toast({ title: msg })
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Image + Alt Text */}
                <SectionCard title="Image" icon={<ImageIcon className="h-3.5 w-3.5" />}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-dashed p-4 flex flex-col items-center gap-2 text-center"
                        style={{ borderColor: "#E5DDD5" }}>
                        <ImageIcon className="h-5 w-5" style={{ color: "#C4B5A5" }} />
                        <p className="text-xs font-medium" style={{ color: "#8A7060" }}>Upload Image/Video</p>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.mp4" className="w-full text-xs" style={{ color: "#8A7060" }} />
                      </div>
                      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                        <p className="text-xs font-medium" style={{ color: "#8A7060" }}>Generate Image</p>
                        <ImagePanel
                          label="Image"
                          prompt={postImagePrompt}
                          onPromptChange={setPostImagePrompt}
                          imageUrl={postImageUrl}
                          imageLoaded={postImageLoaded}
                          imageError={postImageError}
                          onGenerate={handleGeneratePostImage}
                          onRegenerate={handleRegeneratePostImage}
                          onLoad={() => setPostImageLoaded(true)}
                          onError={() => setPostImageError(true)}
                          generating={!postImageLoaded && !!postImageUrl && !postImageError}
                        />
                      </div>
                    </div>
                    {/* Alt text */}
                    {postImageUrl && postImageLoaded && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#A07060" }}>Alt text</p>
                          <button
                            onClick={() => { setAltTextInput(postImagePrompt); handleGenerateAltText() }}
                            disabled={generatingAltText || !postImagePrompt}
                            className="text-[10px] underline" style={{ color: "#F97066" }}>
                            Auto-generate
                          </button>
                        </div>
                        <input
                          value={altText || altTextInput}
                          onChange={(e) => { setAltText(e.target.value); setAltTextInput(e.target.value) }}
                          placeholder="Describe the image for accessibility…"
                          className="w-full text-xs rounded-lg border px-3 py-2 outline-none focus:border-[#F97066]"
                          style={{ borderColor: "#E5DDD5", color: "#2D1810" }}
                        />
                      </div>
                    )}
                    <p className="text-[10px]" style={{ color: "#C4B5A5" }}>Images powered by Pollinations.ai — free, ~5–10s per image.</p>
                  </div>
                </SectionCard>

                {caption && (
                  <div className="flex gap-3">
                    <button onClick={handleSavePost} disabled={savingToPlanner}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ borderColor: "#F97066", color: "#D4432A", backgroundColor: "white" }}>
                      {savingToPlanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save to Planner
                    </button>
                    <button onClick={handleSaveIdea} disabled={savingIdea || !!savedIdeaId}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ borderColor: savedIdeaId ? "#BBF7D0" : "#E5DDD5", color: savedIdeaId ? "#16A34A" : "#7A5C50", backgroundColor: savedIdeaId ? "#F0FDF4" : "white" }}>
                      {savingIdea ? <Loader2 className="h-4 w-4 animate-spin" /> : savedIdeaId ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      {savedIdeaId ? "Saved" : "Save Idea"}
                    </button>
                  </div>
                )}
              </div>

              {/* Live preview */}
              <div className="xl:col-span-2">
                <div className="sticky top-6 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>Live Preview</p>
                  <InstagramPreview
                    brandName={brand.name}
                    caption={caption}
                    hashtags={activeHashtags}
                    imageUrl={postImageUrl}
                    imageLoaded={postImageLoaded}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── CAROUSEL ── */}
          {selectedFormat === "Carousel" && (
            <div className="space-y-5">
              <SectionCard title="Carousel Setup" icon={<LayoutGrid className="h-3.5 w-3.5" />}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#8A7060" }}>Slides:</span>
                    <div className="flex gap-1">
                      {[3,4,5,6,7,8,9,10].map((n) => (
                        <button key={n}
                          onClick={() => setSlideCount(n)}
                          className={cn(
                            "h-7 w-7 rounded-lg text-xs font-medium transition-all",
                            slideCount === n ? "text-white" : "hover:bg-[#F5F0EA]"
                          )}
                          style={{ backgroundColor: slideCount === n ? "#F97066" : "transparent", color: slideCount === n ? "white" : "#7A5C50", border: slideCount === n ? "none" : "1px solid #E5DDD5" }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    <button onClick={handleGenerateCarousel} disabled={generatingCarousel}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ backgroundColor: "#F97066", color: "white" }}>
                      {generatingCarousel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generatingCarousel ? "Generating…" : "Generate Carousel"}
                    </button>
                    {slides.length > 0 && (
                      <>
                        <button onClick={handleExportOutline}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all hover:bg-[#F5F0EA]"
                          style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
                          <Download className="h-3.5 w-3.5" /> Export
                        </button>
                        <CanvaButton
                          label="Build in Canva"
                          onClick={() => {
                            const msg = openInCanva({ title: topic, caption: "", hashtags: "", slides, format: 'carousel' })
                            toast({ title: msg })
                          }}
                        />
                        <button onClick={handleSaveCarousel} disabled={savingToPlanner}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all hover:-translate-y-0.5"
                          style={{ borderColor: "#F97066", color: "#D4432A" }}>
                          {savingToPlanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                        </button>
                        <button onClick={handleSaveIdea} disabled={savingIdea || !!savedIdeaId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all hover:-translate-y-0.5"
                          style={{ borderColor: savedIdeaId ? "#BBF7D0" : "#E5DDD5", color: savedIdeaId ? "#16A34A" : "#7A5C50", backgroundColor: savedIdeaId ? "#F0FDF4" : "transparent" }}>
                          {savingIdea ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : savedIdeaId ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                          {savedIdeaId ? "Saved" : "Save Idea"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Cover Image" icon={<ImageIcon className="h-3.5 w-3.5" />}>
                <ImagePanel
                  label="Cover image"
                  prompt={coverImagePrompt}
                  onPromptChange={setCoverImagePrompt}
                  imageUrl={coverImageUrl}
                  imageLoaded={coverImageLoaded}
                  imageError={coverImageError}
                  onGenerate={handleGenerateCoverImage}
                  onRegenerate={handleRegenerateCoverImage}
                  onLoad={() => setCoverImageLoaded(true)}
                  onError={() => setCoverImageError(true)}
                  generating={!coverImageLoaded && !!coverImageUrl && !coverImageError}
                  aspectRatio="aspect-video"
                />
                <p className="text-[10px]" style={{ color: "#C4B5A5" }}>Powered by Pollinations.ai — free.</p>
              </SectionCard>

              {slides.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  <div className="xl:col-span-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>Slide Cards — click to preview, arrows to reorder</p>
                    {slides.map((slide, idx) => (
                      <div key={slide.id}
                        className={cn("rounded-2xl border p-4 space-y-3 cursor-pointer transition-all", previewSlideIdx === idx ? "border-[#F97066]" : "border-[#E5DDD5]")}
                        style={{ backgroundColor: previewSlideIdx === idx ? "#FEFCF8" : "white" }}
                        onClick={() => setPreviewSlideIdx(idx)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: slide.type === "cover" ? "#FEF0EA" : slide.type === "cta" ? "#FEF0EA" : "#F5F0EA", color: slide.type !== "content" ? "#D4432A" : "#7A5C50" }}>
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-medium capitalize px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: "#F0EAE3", color: "#7A5C50" }}>{slide.type}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); moveSlide(idx, -1) }} disabled={idx === 0}
                              className="h-6 w-6 rounded border flex items-center justify-center disabled:opacity-30 hover:bg-[#F5F0EA]"
                              style={{ borderColor: "#E5DDD5" }}>
                              <ChevronUp className="h-3 w-3" style={{ color: "#7A5C50" }} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); moveSlide(idx, 1) }} disabled={idx === slides.length - 1}
                              className="h-6 w-6 rounded border flex items-center justify-center disabled:opacity-30 hover:bg-[#F5F0EA]"
                              style={{ borderColor: "#E5DDD5" }}>
                              <ChevronDown className="h-3 w-3" style={{ color: "#7A5C50" }} />
                            </button>
                          </div>
                        </div>
                        <input
                          value={slide.title || ""}
                          onChange={(e) => updateSlideField(idx, "title", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-sm font-semibold bg-transparent border-none outline-none focus:bg-[#F5F0EA] rounded px-1 py-0.5"
                          style={{ color: "#2D1810" }}
                          placeholder="Slide title…"
                        />
                        {slide.type === "cover" && slide.hook !== undefined && (
                          <input
                            value={slide.hook || ""}
                            onChange={(e) => updateSlideField(idx, "hook", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs bg-transparent border-none outline-none focus:bg-[#F5F0EA] rounded px-1 py-0.5"
                            style={{ color: "#8A7060" }}
                            placeholder="Hook subtitle…"
                          />
                        )}
                        {slide.type === "content" && slide.bullets && (
                          <ul className="space-y-1">
                            {slide.bullets.map((b, bi) => (
                              <li key={bi} className="flex items-start gap-1.5">
                                <span className="text-[10px] font-bold mt-0.5" style={{ color: "#F97066" }}>•</span>
                                <input
                                  value={b}
                                  onChange={(e) => {
                                    const newBullets = [...(slide.bullets || [])]
                                    newBullets[bi] = e.target.value
                                    updateSlideField(idx, "bullets", newBullets)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 text-xs bg-transparent border-none outline-none focus:bg-[#F5F0EA] rounded px-1 py-0.5"
                                  style={{ color: "#5A3828" }}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                        {slide.type === "cta" && slide.cta !== undefined && (
                          <input
                            value={slide.cta || ""}
                            onChange={(e) => updateSlideField(idx, "cta", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs bg-transparent border-none outline-none focus:bg-[#F5F0EA] rounded px-1 py-0.5"
                            style={{ color: "#8A7060" }}
                            placeholder="CTA text…"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="xl:col-span-2">
                    <div className="sticky top-6">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8A7060" }}>Mobile Preview</p>
                      <CarouselMobilePreview
                        slides={slides}
                        currentIndex={previewSlideIdx}
                        onPrev={() => setPreviewSlideIdx((p) => Math.max(0, p - 1))}
                        onNext={() => setPreviewSlideIdx((p) => Math.min(slides.length - 1, p + 1))}
                        imageUrl={coverImageUrl}
                        imageLoaded={coverImageLoaded}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── REEL ── */}
          {selectedFormat === "Reel" && (
            <div className="space-y-5">
              <SectionCard title="Reel Setup" icon={<Film className="h-3.5 w-3.5" />}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#8A7060" }}>Duration:</span>
                    <div className="flex gap-1">
                      {(["15s", "30s", "60s", "90s"] as const).map((d) => (
                        <button key={d}
                          onClick={() => setReelDuration(d)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            backgroundColor: reelDuration === d ? "#F97066" : "transparent",
                            color: reelDuration === d ? "white" : "#7A5C50",
                            border: reelDuration === d ? "none" : "1px solid #E5DDD5",
                          }}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleGenerateReel} disabled={generatingReel}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ml-auto transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: "#F97066", color: "white" }}>
                    {generatingReel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
                    {generatingReel ? "Writing Script…" : "Generate Script"}
                  </button>
                </div>
              </SectionCard>

              {reelScript && (
                <div className="space-y-4">
                  {/* Hook + Audio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border bg-white p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Hook (first 3s)</p>
                      <p className="text-sm font-semibold leading-snug" style={{ color: "#2D1810" }}>{reelScript.hook}</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                      <div className="flex items-center gap-1.5">
                        <Music className="h-3.5 w-3.5" style={{ color: "#F97066" }} />
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#A07060" }}>Audio Mood</p>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#5A3828" }}>{reelScript.audioMood}</p>
                    </div>
                  </div>

                  {/* Scene timeline */}
                  <div className="rounded-2xl border bg-white p-5 space-y-4" style={{ borderColor: "#E5DDD5" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#2D1810" }}>Scene Breakdown</p>
                      <CopyButton
                        label="Copy Script"
                        text={[
                          `REEL SCRIPT: ${topic}`,
                          `Duration: ${reelDuration}`,
                          `\nHOOK: ${reelScript.hook}`,
                          `\nSCENES:`,
                          ...(reelScript.scenes?.map((s) => `[${s.timestamp}] ${s.description}`) ?? []),
                          `\nVOICEOVER:\n${reelScript.voiceover}`,
                          `\nAUDIO: ${reelScript.audioMood}`,
                          `\nCTA: ${reelScript.cta}`,
                        ].join("\n")}
                      />
                    </div>
                    <div className="space-y-3">
                      {reelScript.scenes?.map((scene, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg h-fit"
                            style={{ backgroundColor: "#FEF0EA", color: "#D4432A" }}>
                            {scene.timestamp}
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: "#2D1810" }}>{scene.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Voiceover */}
                  <div className="rounded-2xl border bg-white p-5 space-y-3" style={{ borderColor: "#E5DDD5" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#2D1810" }}>Voiceover Script</p>
                      <CopyButton text={reelScript.voiceover} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#5A3828" }}>{reelScript.voiceover}</p>
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "#FEF0EA" }}>
                      <p className="text-[10px] font-bold" style={{ color: "#D4432A" }}>CTA</p>
                      <p className="text-xs mt-0.5" style={{ color: "#5A3828" }}>{reelScript.cta}</p>
                    </div>
                  </div>

                  {/* Caption + Hashtags for Reel */}
                  <SectionCard title="Caption & Hashtags" icon={<AlignLeft className="h-3.5 w-3.5" />}>
                    <div className="space-y-3">
                      <button onClick={handleGenerateReelCaption} disabled={generatingReelCaption}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5"
                        style={{ backgroundColor: "#F97066", color: "white" }}>
                        {generatingReelCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {generatingReelCaption ? "Generating…" : "Generate Caption & Hashtags"}
                      </button>
                      {reelCaption && (
                        <div className="space-y-4">
                          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold" style={{ color: "#8A7060" }}>CAPTION</span>
                              <CopyButton text={reelCaption.caption} />
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "#2D1810" }}>{reelCaption.caption}</p>
                          </div>
                          {reelCaptionHashtags && (
                            <div className="space-y-2">
                              {(["niche", "broad", "engagement"] as const).map((grp) => {
                                const colors = grp === "niche" ? { bg: "#FEF0EA", text: "#D4432A" } : grp === "broad" ? { bg: "#F0F4FF", text: "#5B6AC4" } : { bg: "#F0FDF4", text: "#16A34A" }
                                return (
                                  <div key={grp} className="flex flex-wrap gap-1.5">
                                    {reelCaptionHashtags[grp].map((tag) => (
                                      <button key={tag}
                                        onClick={() => setReelCaptionHashtags((prev) => prev ? { ...prev, [grp]: prev[grp].filter((t) => t !== tag) } : prev)}
                                        className="text-xs px-2 py-0.5 rounded-full font-medium hover:opacity-60 transition-opacity"
                                        style={{ backgroundColor: colors.bg, color: colors.text }}>
                                        {tag} ×
                                      </button>
                                    ))}
                                  </div>
                                )
                              })}
                              <CopyButton
                                label="Copy all hashtags"
                                text={[...reelCaptionHashtags.niche, ...reelCaptionHashtags.broad, ...reelCaptionHashtags.engagement].join(" ")}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SectionCard>

                  <div className="flex gap-3 flex-wrap">
                    <button onClick={handleSaveReel} disabled={savingToPlanner}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ borderColor: "#F97066", color: "#D4432A", backgroundColor: "white" }}>
                      {savingToPlanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Script to Planner
                    </button>
                    <button onClick={handleSaveIdea} disabled={savingIdea || !!savedIdeaId}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all hover:-translate-y-0.5"
                      style={{ borderColor: savedIdeaId ? "#BBF7D0" : "#E5DDD5", color: savedIdeaId ? "#16A34A" : "#7A5C50", backgroundColor: savedIdeaId ? "#F0FDF4" : "white" }}>
                      {savingIdea ? <Loader2 className="h-4 w-4 animate-spin" /> : savedIdeaId ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      {savedIdeaId ? "Saved" : "Save Idea"}
                    </button>
                    <CanvaButton
                      label="Open CapCut"
                      onClick={() => {
                        const script = reelScript ? [
                          `REEL: ${topic}`,
                          `HOOK: ${reelScript.hook}`,
                          `\nVOICEOVER:\n${reelScript.voiceover}`,
                          `\nCTA: ${reelScript.cta}`,
                        ].join("\n") : topic
                        const msg = openInCanva({ title: topic, caption: script, hashtags: "", format: 'reel' })
                        toast({ title: msg })
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContentCreatorClient({
  brand,
  initialPillars,
  socialAccounts,
  userId,
}: {
  brand: Brand | null
  initialPillars: ContentPillar[]
  socialAccounts: Record<string, string>
  userId: string
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [pillars, setPillars] = useState<ContentPillar[]>(initialPillars)
  const { insights: savedInsights, save: saveInsight } = useSavedInsights(userId)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loadedIdea, setLoadedIdea] = useState<Idea | null>(null)

  const handleSaveInsight = (text: string, source: "opportunity" | "niche" | "analyser") => {
    saveInsight(text, source)
  }

  const fetchIdeas = async () => {
    if (!brand) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("ideas") as any)
      .select("*")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })
    setIdeas(data ?? [])
  }

  useEffect(() => { fetchIdeas() }, [brand?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteIdea = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("ideas") as any).delete().eq("id", id)
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    toast({ title: "Idea deleted" })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ══ Section 1: Research ══ */}
      <div>
        <SectionLabel label="Research" icon={<Search className="h-3.5 w-3.5" />} />
        <ResearchStrip
          brand={brand}
          socialAccounts={socialAccounts}
          userId={userId}
          onSaveInsight={handleSaveInsight}
        />
      </div>

      <div style={{ borderTop: "1px solid #E5DDD5" }} />

      {/* ══ Section 2: Content Pillars ══ */}
      <div>
        <SectionLabel label="Content Pillars" icon={<Layers className="h-3.5 w-3.5" />} />
        <PillarsStrip
          brand={brand}
          initialPillars={initialPillars}
          onPillarsChange={setPillars}
        />
      </div>

      <div style={{ borderTop: "1px solid #E5DDD5" }} />

      {/* ══ Section 3: Content Generation ══ */}
      <div>
        <SectionLabel label="Content Generation" icon={<Sparkles className="h-3.5 w-3.5" />} />

        {!brand ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#FEF0EA" }}>
              <Sparkles className="h-8 w-8" style={{ color: "#F97066" }} />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold" style={{ color: "#2D1810" }}>No brand set up yet</h2>
              <p className="text-sm mt-1" style={{ color: "#8A7060" }}>
                Create a brand profile so the AI can generate content tailored to your niche and tone.
              </p>
            </div>
            <Button asChild style={{ backgroundColor: "#F97066", color: "white" }}>
              <a href="/brands/new">Create a Brand</a>
            </Button>
          </div>
        ) : (
          <GenerationStrip
            brand={brand}
            pillars={pillars}
            savedInsights={savedInsights}
            userId={userId}
            loadedIdea={loadedIdea}
            onIdeaSaved={fetchIdeas}
          />
        )}
      </div>

      <div style={{ borderTop: "1px solid #E5DDD5" }} />

      {/* ══ Section 4: Ideas Bank ══ */}
      {brand && (
        <div>
          <IdeasBank
            ideas={ideas}
            pillars={pillars}
            onLoad={(idea) => {
              setLoadedIdea(idea)
              window.scrollTo({ top: 0, behavior: "smooth" })
              toast({ title: "Idea loaded — scroll up to continue editing" })
            }}
            onDelete={handleDeleteIdea}
            onRefresh={fetchIdeas}
          />
        </div>
      )}
    </div>
  )
}
