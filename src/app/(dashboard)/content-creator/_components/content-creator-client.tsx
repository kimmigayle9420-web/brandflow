"use client"

import { useState, useEffect, useCallback } from "react"
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
  Hash, AlignLeft, MousePointerClick, Music, Clapperboard,
} from "lucide-react"
import type { Brand } from "@/types"

// ── Types ────────────────────────────────────────────────────────────────────

interface CarouselSlide {
  id: number
  type: "cover" | "content" | "cta"
  title: string
  hook?: string      // cover only
  bullets?: string[] // content only
  cta?: string       // cta only
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPollinationsUrl(prompt: string, niche?: string, seed?: number): string {
  const fullPrompt = [
    prompt,
    niche ? `${niche} aesthetic` : "",
    "professional content creator photography, high quality, instagram",
  ]
    .filter(Boolean)
    .join(", ")
  const encoded = encodeURIComponent(fullPrompt)
  const seedParam = seed !== undefined ? `&seed=${seed}` : ""
  return `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=1080&nologo=true${seedParam}`
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
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
  label,
  prompt,
  onPromptChange,
  imageUrl,
  imageLoaded,
  imageError,
  onGenerate,
  onRegenerate,
  onLoad,
  onError,
  generating,
  aspectRatio = "aspect-square",
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
        <Button
          onClick={onGenerate}
          disabled={!prompt.trim() || generating}
          size="sm"
          className="gap-1.5 shrink-0"
          style={{ backgroundColor: "#F97066", color: "white" }}
        >
          {generating && !imageLoaded ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
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
  brandName,
  caption,
  hashtags,
  imageUrl,
  imageLoaded,
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
      {/* Header */}
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

      {/* Image area */}
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

      {/* Actions row */}
      <div className="flex items-center gap-3 px-3 py-2" style={{ color: "#2D1810" }}>
        <span className="text-xl">♡</span>
        <span className="text-xl">💬</span>
        <span className="text-xl">↗</span>
        <span className="ml-auto text-xl">🔖</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 space-y-1.5">
        {caption ? (
          <p className="text-xs leading-relaxed" style={{ color: "#2D1810" }}>
            <span className="font-semibold">
              {brandName ? brandName.toLowerCase().replace(/\s+/g, "_") : "your_brand"}
            </span>{" "}
            {caption.length > 180 ? caption.substring(0, 180) + "…" : caption}
          </p>
        ) : (
          <p className="text-xs italic" style={{ color: "#C4B5A5" }}>
            Caption will appear here as you build it…
          </p>
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
  slides,
  currentIndex,
  onPrev,
  onNext,
  imageUrl,
  imageLoaded,
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

  const bgColor = slide.type === "cover" ? "#FEF0EA"
    : slide.type === "cta" ? "#F97066"
    : "#FFFFFF"
  const textColor = slide.type === "cta" ? "#FFFFFF" : "#2D1810"
  const mutedColor = slide.type === "cta" ? "rgba(255,255,255,0.8)" : "#8A7060"

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Phone frame */}
      <div className="w-[260px] rounded-3xl border-4 overflow-hidden"
        style={{ borderColor: "#2D1810", boxShadow: "0 4px 20px rgba(45,24,16,0.2)" }}>

        {/* Cover image (only on cover slide when image is set) */}
        {slide.type === "cover" && imageUrl && imageLoaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Cover" className="w-full aspect-video object-cover" />
        )}
        {slide.type === "cover" && imageUrl && !imageLoaded && (
          <div className="w-full aspect-video flex items-center justify-center" style={{ backgroundColor: "#F5F0EA" }}>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#F97066" }} />
          </div>
        )}

        {/* Slide content */}
        <div className="p-4 min-h-[200px] flex flex-col justify-center"
          style={{ backgroundColor: bgColor }}>

          {/* Slide number badge */}
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

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={onPrev} disabled={currentIndex === 0}
          className="h-8 w-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs" style={{ color: "#8A7060" }}>
          {currentIndex + 1} of {slides.length}
        </span>
        <button onClick={onNext} disabled={currentIndex === slides.length - 1}
          className="h-8 w-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContentCreatorClient({ brand }: { brand: Brand | null }) {
  const supabase = createClient()
  const { toast } = useToast()

  // ── POST tab state ──────────────────────────────────────────────────────
  const [hookTopic, setHookTopic] = useState("")
  const [generatingHooks, setGeneratingHooks] = useState(false)
  const [hooks, setHooks] = useState<string[]>([])
  const [selectedHookIdx, setSelectedHookIdx] = useState<number | null>(null)
  const [captionNotes, setCaptionNotes] = useState("")
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [caption, setCaption] = useState("")
  const [generatingHashtags, setGeneratingHashtags] = useState(false)
  const [hashtags, setHashtags] = useState<HashtagGroups | null>(null)
  const [generatingAltText, setGeneratingAltText] = useState(false)
  const [altTextInput, setAltTextInput] = useState("")
  const [altText, setAltText] = useState("")
  // Post image (Pollinations)
  const [postImagePrompt, setPostImagePrompt] = useState("")
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null)
  const [postImageLoaded, setPostImageLoaded] = useState(false)
  const [postImageError, setPostImageError] = useState(false)

  // ── CAROUSEL tab state ──────────────────────────────────────────────────
  const [carouselTopic, setCarouselTopic] = useState("")
  const [slideCount, setSlideCount] = useState(5)
  const [generatingCarousel, setGeneratingCarousel] = useState(false)
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0)
  // Carousel image (Pollinations)
  const [coverImagePrompt, setCoverImagePrompt] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverImageLoaded, setCoverImageLoaded] = useState(false)
  const [coverImageError, setCoverImageError] = useState(false)

  // ── REEL tab state ──────────────────────────────────────────────────────
  const [reelConcept, setReelConcept] = useState("")
  const [reelDuration, setReelDuration] = useState<"15s" | "30s" | "60s" | "90s">("30s")
  const [generatingReel, setGeneratingReel] = useState(false)
  const [reelScript, setReelScript] = useState<ReelScript | null>(null)
  const [generatingReelHooks, setGeneratingReelHooks] = useState(false)
  const [reelHooks, setReelHooks] = useState<string[]>([])
  const [selectedReelHookIdx, setSelectedReelHookIdx] = useState<number | null>(null)
  const [generatingReelCaption, setGeneratingReelCaption] = useState(false)
  const [reelCaption, setReelCaption] = useState<{ caption: string; hashtags: HashtagGroups } | null>(null)

  // ── Saving ──────────────────────────────────────────────────────────────
  const [savingToPlanner, setSavingToPlanner] = useState(false)

  // ── Auto-fill image prompt from caption ──────────────────────────────────
  useEffect(() => {
    if (caption && !postImagePrompt) {
      const suggestion = caption.split(/[.\n]/)[0]?.trim().substring(0, 80) ?? ""
      if (suggestion) setPostImagePrompt(suggestion)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption])

  // Auto-fill cover image prompt from carousel topic
  useEffect(() => {
    if (carouselTopic && !coverImagePrompt) {
      setCoverImagePrompt(carouselTopic.substring(0, 80))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselTopic])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const brandCtx = useCallback(() => ({
    brandName: brand?.name,
    niche: brand?.niche,
    tone: brand?.tone_of_voice ?? undefined,
    targetAudience: brand?.target_audience ?? undefined,
  }), [brand])

  const showError = (err: unknown) => {
    toast({
      title: "Generation failed",
      description: err instanceof Error ? err.message : "Check your ANTHROPIC_API_KEY in .env.local",
      variant: "destructive",
    })
  }

  async function callApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? "Request failed")
    return data as T
  }

  // ── POST tab handlers ─────────────────────────────────────────────────────

  const handleGenerateHooks = async () => {
    if (!hookTopic.trim()) return
    setGeneratingHooks(true)
    setHooks([])
    setSelectedHookIdx(null)
    try {
      const data = await callApi<{ hooks: string[] }>("/api/generate-hooks", {
        topic: hookTopic,
        ...brandCtx(),
      })
      setHooks(data.hooks ?? [])
    } catch (err) { showError(err) }
    setGeneratingHooks(false)
  }

  const handleGenerateCaption = async () => {
    const selectedHook = selectedHookIdx !== null ? hooks[selectedHookIdx] : ""
    setGeneratingCaption(true)
    setCaption("")
    try {
      const data = await callApi<{ caption: string }>("/api/generate-caption", {
        hook: selectedHook || hookTopic,
        notes: captionNotes,
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
      const data = await callApi<HashtagGroups>("/api/generate-hashtags", {
        niche: brand?.niche,
        caption,
        brandName: brand?.name,
      })
      setHashtags(data)
    } catch (err) { showError(err) }
    setGeneratingHashtags(false)
  }

  const handleGenerateAltText = async () => {
    if (!altTextInput.trim()) return
    setGeneratingAltText(true)
    setAltText("")
    try {
      const data = await callApi<{ altText: string }>("/api/generate-alt-text", {
        imageDescription: altTextInput,
        brandName: brand?.name,
        niche: brand?.niche,
      })
      setAltText(data.altText ?? "")
    } catch (err) { showError(err) }
    setGeneratingAltText(false)
  }

  // Post image (Pollinations)
  const handleGeneratePostImage = () => {
    if (!postImagePrompt.trim()) return
    const seed = Math.floor(Math.random() * 99999)
    setPostImageLoaded(false)
    setPostImageError(false)
    setPostImageUrl(buildPollinationsUrl(postImagePrompt, brand?.niche, seed))
  }

  const handleRegeneratePostImage = () => {
    if (!postImagePrompt.trim() || !postImageUrl) return
    const seed = Math.floor(Math.random() * 99999)
    setPostImageLoaded(false)
    setPostImageError(false)
    setPostImageUrl(buildPollinationsUrl(postImagePrompt, brand?.niche, seed))
  }

  // ── CAROUSEL handlers ─────────────────────────────────────────────────────

  const handleGenerateCarousel = async () => {
    if (!carouselTopic.trim()) return
    setGeneratingCarousel(true)
    setSlides([])
    setPreviewSlideIdx(0)
    try {
      const data = await callApi<{ slides: CarouselSlide[] }>("/api/generate-carousel", {
        topic: carouselTopic,
        slideCount,
        ...brandCtx(),
      })
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
    const lines: string[] = [`CAROUSEL: ${carouselTopic}\n`]
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

  // Cover image (Pollinations)
  const handleGenerateCoverImage = () => {
    if (!coverImagePrompt.trim()) return
    const seed = Math.floor(Math.random() * 99999)
    setCoverImageLoaded(false)
    setCoverImageError(false)
    setCoverImageUrl(buildPollinationsUrl(coverImagePrompt, brand?.niche, seed))
  }

  const handleRegenerateCoverImage = () => {
    if (!coverImagePrompt.trim() || !coverImageUrl) return
    const seed = Math.floor(Math.random() * 99999)
    setCoverImageLoaded(false)
    setCoverImageError(false)
    setCoverImageUrl(buildPollinationsUrl(coverImagePrompt, brand?.niche, seed))
  }

  // ── REEL handlers ─────────────────────────────────────────────────────────

  const handleGenerateReel = async () => {
    if (!reelConcept.trim()) return
    setGeneratingReel(true)
    setReelScript(null)
    setReelHooks([])
    setReelCaption(null)
    try {
      const data = await callApi<ReelScript>("/api/generate-reel", {
        concept: reelConcept,
        duration: reelDuration,
        ...brandCtx(),
      })
      setReelScript(data)
    } catch (err) { showError(err) }
    setGeneratingReel(false)
  }

  const handleGenerateReelHooks = async () => {
    if (!reelConcept.trim()) return
    setGeneratingReelHooks(true)
    setReelHooks([])
    try {
      const data = await callApi<{ hooks: string[] }>("/api/generate-hooks", {
        topic: reelConcept,
        ...brandCtx(),
      })
      setReelHooks(data.hooks ?? [])
    } catch (err) { showError(err) }
    setGeneratingReelHooks(false)
  }

  const handleGenerateReelCaption = async () => {
    const hook = selectedReelHookIdx !== null ? reelHooks[selectedReelHookIdx]
      : reelScript?.hook ?? reelConcept
    setGeneratingReelCaption(true)
    setReelCaption(null)
    try {
      const [captionData, hashtagData] = await Promise.all([
        callApi<{ caption: string }>("/api/generate-caption", {
          hook,
          notes: `This is for a Reel about: ${reelConcept}`,
          ...brandCtx(),
        }),
        callApi<HashtagGroups>("/api/generate-hashtags", {
          niche: brand?.niche,
          caption: hook,
          brandName: brand?.name,
        }),
      ])
      setReelCaption({ caption: captionData.caption ?? "", hashtags: hashtagData })
    } catch (err) { showError(err) }
    setGeneratingReelCaption(false)
  }

  // ── Save to Planner ───────────────────────────────────────────────────────

  const handleSavePost = async () => {
    if (!brand || !caption) return
    setSavingToPlanner(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const allHashtags = hashtags
        ? [...hashtags.niche, ...hashtags.broad, ...hashtags.engagement].join(" ")
        : ""
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("posts") as any).insert({
        brand_id: brand.id,
        user_id: user!.id,
        platform: "instagram",
        format: "static",
        caption_draft: caption,
        hashtags: allHashtags || null,
        status: "draft",
      })
      if (error) throw new Error(error.message)
      toast({ title: "Saved to planner!", description: "Post added as draft." })
    } catch (err) { showError(err) }
    setSavingToPlanner(false)
  }

  const handleSaveCarousel = async () => {
    if (!brand || !slides.length) return
    setSavingToPlanner(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("posts") as any).insert({
        brand_id: brand.id,
        user_id: user!.id,
        platform: "instagram",
        format: "carousel",
        caption_draft: carouselTopic,
        notes: JSON.stringify({ slides }),
        status: "draft",
      })
      if (error) throw new Error(error.message)
      toast({ title: "Carousel saved to planner!", description: "Added as draft." })
    } catch (err) { showError(err) }
    setSavingToPlanner(false)
  }

  const handleSaveReel = async () => {
    if (!brand || !reelScript) return
    setSavingToPlanner(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("posts") as any).insert({
        brand_id: brand.id,
        user_id: user!.id,
        platform: "instagram",
        format: "reel",
        caption_draft: reelConcept,
        notes: JSON.stringify(reelScript),
        status: "draft",
      })
      if (error) throw new Error(error.message)
      toast({ title: "Reel script saved to planner!", description: "Added as draft." })
    } catch (err) { showError(err) }
    setSavingToPlanner(false)
  }

  // ── No brand state ────────────────────────────────────────────────────────

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "#FEF0EA" }}>
          <Sparkles className="h-8 w-8" style={{ color: "#F97066" }} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: "#2D1810" }}>No brand set up yet</h2>
          <p className="text-sm mt-1" style={{ color: "#8A7060" }}>
            Create a brand profile first so the AI can generate content tailored to your niche and tone.
          </p>
        </div>
        <Button asChild style={{ backgroundColor: "#F97066", color: "white" }}>
          <a href="/brands/new">Create a Brand</a>
        </Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const allHashtagsStr = hashtags
    ? [...hashtags.niche, ...hashtags.broad, ...hashtags.engagement].join(" ")
    : ""

  return (
    <div className="space-y-6">
      {/* Brand badge */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: brand.primary_color || "#F97066" }}>
          {brand.name.charAt(0)}
        </div>
        <span className="text-sm font-medium" style={{ color: "#2D1810" }}>{brand.name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F5F0EA", color: "#8A7060" }}>
          {brand.niche}
        </span>
      </div>

      <Tabs defaultValue="post">
        <TabsList className="rounded-xl p-1" style={{ backgroundColor: "#F0EAE3" }}>
          {[
            { value: "post", label: "Post", icon: <FileText className="h-3.5 w-3.5" /> },
            { value: "carousel", label: "Carousel", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { value: "reel", label: "Reel", icon: <Film className="h-3.5 w-3.5" /> },
          ].map(({ value, label, icon }) => (
            <TabsTrigger key={value} value={value}
              className="gap-1.5 rounded-lg text-sm font-medium data-[state=active]:shadow-sm"
              style={{ "--tw-ring-color": "#F97066" } as React.CSSProperties}
            >
              {icon}{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            POST TAB
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="post" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* Left: form sections */}
            <div className="xl:col-span-3 space-y-5">

              {/* Hook Generator */}
              <SectionCard title="Hook Generator" icon={<Wand2 className="h-3.5 w-3.5" />}>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{ color: "#8A7060" }}>Topic or angle</Label>
                    <Textarea
                      value={hookTopic}
                      onChange={(e) => setHookTopic(e.target.value)}
                      placeholder="e.g. 'why most morning routines fail' or 'my biggest nutrition mistake'"
                      rows={2}
                      className="text-sm resize-none"
                      style={{ borderColor: "#E5DDD5" }}
                    />
                  </div>
                  <ActionButton onClick={handleGenerateHooks} loading={generatingHooks}
                    disabled={!hookTopic.trim()}>
                    {generatingHooks ? "Generating…" : "Generate 5 Hooks"}
                  </ActionButton>

                  {hooks.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium" style={{ color: "#8A7060" }}>
                        Click a hook to select it:
                      </p>
                      {hooks.map((hook, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedHookIdx(i === selectedHookIdx ? null : i)}
                          className={cn(
                            "w-full text-left text-sm px-4 py-3 rounded-xl border transition-all",
                            selectedHookIdx === i
                              ? "border-[#F97066] bg-[#FEF0EA]"
                              : "border-[#E5DDD5] hover:border-[#F97066]/50 hover:bg-[#FEFCF8]"
                          )}
                          style={{ color: "#2D1810" }}
                        >
                          <span className="text-xs font-bold mr-2" style={{ color: "#F97066" }}>{i + 1}.</span>
                          {hook}
                          {selectedHookIdx === i && (
                            <span className="ml-2 text-xs font-semibold" style={{ color: "#F97066" }}>✓ Selected</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Caption Generator */}
              <SectionCard title="Caption Generator" icon={<AlignLeft className="h-3.5 w-3.5" />}>
                <div className="space-y-3">
                  {selectedHookIdx !== null && (
                    <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#FEF0EA", color: "#D4432A" }}>
                      <span className="font-semibold">Hook: </span>{hooks[selectedHookIdx]}
                    </div>
                  )}
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{ color: "#8A7060" }}>
                      Additional context or notes (optional)
                    </Label>
                    <Textarea
                      value={captionNotes}
                      onChange={(e) => setCaptionNotes(e.target.value)}
                      placeholder="Any specific points to include, personal story, product mention…"
                      rows={2}
                      className="text-sm resize-none"
                      style={{ borderColor: "#E5DDD5" }}
                    />
                  </div>
                  <ActionButton onClick={handleGenerateCaption} loading={generatingCaption}>
                    {generatingCaption ? "Writing…" : "Generate Caption"}
                  </ActionButton>

                  {(caption || generatingCaption) && (
                    <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                      {generatingCaption ? (
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#8A7060" }}>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#F97066" }} />
                          Writing your caption…
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: "#8A7060" }}>GENERATED CAPTION</span>
                            <CopyButton text={caption} />
                          </div>
                          <Textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={6}
                            className="text-sm"
                            style={{ borderColor: "#E5DDD5" }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Hashtag Generator */}
              <SectionCard title="Hashtag Generator" icon={<Hash className="h-3.5 w-3.5" />}>
                <div className="space-y-3">
                  <ActionButton onClick={handleGenerateHashtags} loading={generatingHashtags}>
                    {generatingHashtags ? "Generating…" : "Generate Hashtags"}
                  </ActionButton>

                  {hashtags && (
                    <div className="space-y-3">
                      {[
                        { key: "niche" as const, label: "Niche", desc: "targeted community", color: "#FEF0EA", textColor: "#D4432A" },
                        { key: "broad" as const, label: "Broad", desc: "high reach", color: "#F0F4FF", textColor: "#5B6AC4" },
                        { key: "engagement" as const, label: "Engagement", desc: "save & share triggers", color: "#F0FDF4", textColor: "#16A34A" },
                      ].map(({ key, label, desc, color, textColor }) => (
                        <div key={key} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold" style={{ color: "#2D1810" }}>{label}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color, color: textColor }}>
                                {desc}
                              </span>
                            </div>
                            <CopyButton text={hashtags[key].join(" ")} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {hashtags[key].map((tag) => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: color, color: textColor }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <CopyButton text={allHashtagsStr} label="Copy all hashtags" />
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Image Generator (Pollinations) */}
              <SectionCard title="Image Generator" icon={<ImageIcon className="h-3.5 w-3.5" />}>
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
                <p className="text-[10px]" style={{ color: "#C4B5A5" }}>
                  Powered by Pollinations.ai — free, no API key needed. ~5–10s per image.
                </p>
              </SectionCard>

              {/* Alt Text Generator */}
              <SectionCard title="Alt Text Generator" icon={<FileText className="h-3.5 w-3.5" />}>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{ color: "#8A7060" }}>Describe your image</Label>
                    <Input
                      value={altTextInput}
                      onChange={(e) => setAltTextInput(e.target.value)}
                      placeholder="e.g. 'flatlay of healthy breakfast bowl with fruits and granola'"
                      className="text-sm"
                      style={{ borderColor: "#E5DDD5" }}
                    />
                  </div>
                  <ActionButton onClick={handleGenerateAltText} loading={generatingAltText}
                    disabled={!altTextInput.trim()}>
                    {generatingAltText ? "Generating…" : "Generate Alt Text"}
                  </ActionButton>
                  {altText && (
                    <div className="flex items-start gap-2 rounded-xl border p-3" style={{ borderColor: "#E5DDD5" }}>
                      <p className="text-sm flex-1" style={{ color: "#2D1810" }}>{altText}</p>
                      <CopyButton text={altText} />
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Save to Planner */}
              {caption && (
                <Button onClick={handleSavePost} disabled={savingToPlanner}
                  className="gap-2 w-full" variant="outline"
                  style={{ borderColor: "#F97066", color: "#D4432A" }}>
                  {savingToPlanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingToPlanner ? "Saving…" : "Save Post to Planner"}
                </Button>
              )}
            </div>

            {/* Right: Instagram preview (sticky) */}
            <div className="xl:col-span-2">
              <div className="sticky top-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>Live Preview</p>
                <InstagramPreview
                  brandName={brand.name}
                  caption={caption}
                  hashtags={hashtags}
                  imageUrl={postImageUrl}
                  imageLoaded={postImageLoaded}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            CAROUSEL TAB
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="carousel" className="mt-6">
          <div className="space-y-5">

            {/* Form */}
            <SectionCard title="Carousel Setup" icon={<LayoutGrid className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs" style={{ color: "#8A7060" }}>Topic</Label>
                  <Input
                    value={carouselTopic}
                    onChange={(e) => setCarouselTopic(e.target.value)}
                    placeholder="e.g. '5 signs your body needs a reset'"
                    className="text-sm"
                    style={{ borderColor: "#E5DDD5" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "#8A7060" }}>Slides</Label>
                  <select
                    value={slideCount}
                    onChange={(e) => setSlideCount(Number(e.target.value))}
                    className="w-full text-sm rounded-xl border px-3 h-10"
                    style={{ borderColor: "#E5DDD5", color: "#2D1810" }}
                  >
                    {[3,4,5,6,7,8,9,10].map((n) => (
                      <option key={n} value={n}>{n} slides</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ActionButton onClick={handleGenerateCarousel} loading={generatingCarousel}
                  disabled={!carouselTopic.trim()}>
                  {generatingCarousel ? "Generating…" : "Generate Carousel"}
                </ActionButton>
                {slides.length > 0 && (
                  <>
                    <Button onClick={handleExportOutline} variant="outline" className="gap-2"
                      style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
                      <Download className="h-4 w-4" />Export Outline
                    </Button>
                    <Button onClick={handleSaveCarousel} disabled={savingToPlanner} variant="outline"
                      className="gap-2" style={{ borderColor: "#F97066", color: "#D4432A" }}>
                      {savingToPlanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save to Planner
                    </Button>
                  </>
                )}
              </div>
            </SectionCard>

            {/* Cover Image (Pollinations) */}
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
              <p className="text-[10px]" style={{ color: "#C4B5A5" }}>
                Powered by Pollinations.ai — free, no API key needed.
              </p>
            </SectionCard>

            {/* Slides + Preview */}
            {slides.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* Slide Cards */}
                <div className="xl:col-span-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>
                    Slide Cards — click to edit, drag arrows to reorder
                  </p>
                  {slides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className={cn(
                        "rounded-2xl border p-4 space-y-3 cursor-pointer transition-all",
                        previewSlideIdx === idx ? "border-[#F97066]" : "border-[#E5DDD5]"
                      )}
                      style={{ backgroundColor: previewSlideIdx === idx ? "#FEFCF8" : "white" }}
                      onClick={() => setPreviewSlideIdx(idx)}
                    >
                      {/* Slide header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: slide.type === "cover" ? "#FEF0EA" : slide.type === "cta" ? "#FEF0EA" : "#F5F0EA",
                              color: slide.type === "cover" ? "#D4432A" : slide.type === "cta" ? "#D4432A" : "#7A5C50"
                            }}>
                            {idx + 1}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize"
                            style={{ borderColor: "#E5DDD5", color: "#8A7060" }}>
                            {slide.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); moveSlide(idx, -1) }}
                            disabled={idx === 0}
                            className="h-6 w-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-[#F5F0EA]">
                            <ChevronUp className="h-3.5 w-3.5" style={{ color: "#8A7060" }} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveSlide(idx, 1) }}
                            disabled={idx === slides.length - 1}
                            className="h-6 w-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-[#F5F0EA]">
                            <ChevronDown className="h-3.5 w-3.5" style={{ color: "#8A7060" }} />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Label className="text-[10px] mb-1 block" style={{ color: "#8A7060" }}>Title</Label>
                        <Input
                          value={slide.title}
                          onChange={(e) => updateSlideField(idx, "title", e.target.value)}
                          className="text-sm font-medium"
                          style={{ borderColor: "#E5DDD5" }}
                        />
                      </div>

                      {/* Cover: hook */}
                      {slide.type === "cover" && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Label className="text-[10px] mb-1 block" style={{ color: "#8A7060" }}>Hook subtitle</Label>
                          <Input
                            value={slide.hook ?? ""}
                            onChange={(e) => updateSlideField(idx, "hook", e.target.value)}
                            className="text-sm"
                            style={{ borderColor: "#E5DDD5" }}
                          />
                        </div>
                      )}

                      {/* Content: bullets */}
                      {slide.type === "content" && slide.bullets && (
                        <div onClick={(e) => e.stopPropagation()} className="space-y-1.5">
                          <Label className="text-[10px] mb-1 block" style={{ color: "#8A7060" }}>Bullet points</Label>
                          {slide.bullets.map((bullet, bi) => (
                            <div key={bi} className="flex items-center gap-2">
                              <span className="text-xs font-bold shrink-0" style={{ color: "#F97066" }}>→</span>
                              <Input
                                value={bullet}
                                onChange={(e) => {
                                  const updated = [...(slide.bullets ?? [])]
                                  updated[bi] = e.target.value
                                  updateSlideField(idx, "bullets", updated)
                                }}
                                className="text-xs"
                                style={{ borderColor: "#E5DDD5" }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CTA slide */}
                      {slide.type === "cta" && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Label className="text-[10px] mb-1 block" style={{ color: "#8A7060" }}>CTA text</Label>
                          <Textarea
                            value={slide.cta ?? ""}
                            onChange={(e) => updateSlideField(idx, "cta", e.target.value)}
                            rows={2}
                            className="text-sm resize-none"
                            style={{ borderColor: "#E5DDD5" }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Carousel Preview */}
                <div className="xl:col-span-2">
                  <div className="sticky top-6 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>Live Preview</p>
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
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            REEL TAB
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="reel" className="mt-6">
          <div className="max-w-3xl space-y-5">

            {/* Form */}
            <SectionCard title="Reel Setup" icon={<Film className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs" style={{ color: "#8A7060" }}>Concept</Label>
                  <Textarea
                    value={reelConcept}
                    onChange={(e) => setReelConcept(e.target.value)}
                    placeholder="e.g. 'why your morning routine isn't working' or 'the 1 habit that changed everything'"
                    rows={2}
                    className="text-sm resize-none"
                    style={{ borderColor: "#E5DDD5" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "#8A7060" }}>Duration</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["15s", "30s", "60s", "90s"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setReelDuration(d)}
                        className={cn(
                          "py-2 rounded-xl border text-xs font-semibold transition-all",
                          reelDuration === d
                            ? "border-[#F97066] bg-[#FEF0EA] text-[#D4432A]"
                            : "border-[#E5DDD5] text-[#7A5C50] hover:bg-[#F5F0EA]"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ActionButton onClick={handleGenerateReel} loading={generatingReel}
                  disabled={!reelConcept.trim()}>
                  {generatingReel ? "Writing script…" : "Generate Reel Script"}
                </ActionButton>
                <Button onClick={handleGenerateReelHooks} disabled={generatingReelHooks || !reelConcept.trim()}
                  variant="outline" className="gap-2"
                  style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
                  {generatingReelHooks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generatingReelHooks ? "Generating…" : "5 Hook Ideas"}
                </Button>
                <Button onClick={handleGenerateReelCaption}
                  disabled={generatingReelCaption || !reelConcept.trim()}
                  variant="outline" className="gap-2"
                  style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}>
                  {generatingReelCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlignLeft className="h-4 w-4" />}
                  {generatingReelCaption ? "Generating…" : "Caption + Hashtags"}
                </Button>
              </div>
            </SectionCard>

            {/* Hook ideas */}
            {reelHooks.length > 0 && (
              <SectionCard title="Hook Ideas" icon={<Wand2 className="h-3.5 w-3.5" />}>
                <p className="text-xs" style={{ color: "#8A7060" }}>Select one to use as your reel opening or for the caption:</p>
                <div className="space-y-2">
                  {reelHooks.map((hook, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedReelHookIdx(i === selectedReelHookIdx ? null : i)}
                      className={cn(
                        "w-full text-left text-sm px-4 py-3 rounded-xl border transition-all",
                        selectedReelHookIdx === i
                          ? "border-[#F97066] bg-[#FEF0EA]"
                          : "border-[#E5DDD5] hover:border-[#F97066]/50 hover:bg-[#FEFCF8]"
                      )}
                      style={{ color: "#2D1810" }}
                    >
                      <span className="text-xs font-bold mr-2" style={{ color: "#F97066" }}>{i + 1}.</span>
                      {hook}
                    </button>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Reel Script */}
            {reelScript && (
              <SectionCard title="Reel Script" icon={<Clapperboard className="h-3.5 w-3.5" />}>
                <div className="space-y-4">
                  {/* Hook */}
                  <div className="rounded-xl p-4 border-l-4" style={{ backgroundColor: "#FEF0EA", borderLeftColor: "#F97066" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#F97066", color: "white" }}>HOOK</span>
                        <span className="text-xs" style={{ color: "#8A7060" }}>First 3 seconds</span>
                      </div>
                      <CopyButton text={reelScript.hook} />
                    </div>
                    <p className="text-sm font-semibold italic" style={{ color: "#2D1810" }}>
                      "{reelScript.hook}"
                    </p>
                  </div>

                  {/* Scenes */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8A7060" }}>Scene Breakdown</p>
                    {reelScript.scenes.map((scene, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: "#F5F0EA", color: "#D4432A" }}>
                            {i + 1}
                          </div>
                          {i < reelScript.scenes.length - 1 && (
                            <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: "#E5DDD5", minHeight: "16px" }} />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "#F5F0EA", color: "#8A7060" }}>
                              {scene.timestamp}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: "#2D1810" }}>{scene.description}</p>
                        </div>
                        <CopyButton text={scene.description} />
                      </div>
                    ))}
                  </div>

                  {/* Voiceover */}
                  <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: "#8A7060" }}>VOICEOVER / SCRIPT</span>
                      <CopyButton text={reelScript.voiceover} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#2D1810" }}>{reelScript.voiceover}</p>
                  </div>

                  {/* Audio mood */}
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: "#F5F0EA" }}>
                    <Music className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#F97066" }} />
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: "#2D1810" }}>Suggested Audio Mood</p>
                      <p className="text-xs" style={{ color: "#8A7060" }}>{reelScript.audioMood}</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: "#FEF0EA" }}>
                    <MousePointerClick className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#F97066" }} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold mb-0.5" style={{ color: "#2D1810" }}>Closing CTA</p>
                      <p className="text-xs" style={{ color: "#7A5C50" }}>{reelScript.cta}</p>
                    </div>
                    <CopyButton text={reelScript.cta} />
                  </div>

                  <Button onClick={handleSaveReel} disabled={savingToPlanner} variant="outline"
                    className="gap-2 w-full" style={{ borderColor: "#F97066", color: "#D4432A" }}>
                    {savingToPlanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingToPlanner ? "Saving…" : "Save Reel Script to Planner"}
                  </Button>
                </div>
              </SectionCard>
            )}

            {/* Reel Caption + Hashtags */}
            {reelCaption && (
              <SectionCard title="Accompanying Post" icon={<AlignLeft className="h-3.5 w-3.5" />}>
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#E5DDD5" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: "#8A7060" }}>CAPTION</span>
                      <CopyButton text={reelCaption.caption} />
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#2D1810" }}>
                      {reelCaption.caption}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold" style={{ color: "#8A7060" }}>HASHTAGS</p>
                    {[
                      { key: "niche" as const, label: "Niche", color: "#FEF0EA", textColor: "#D4432A" },
                      { key: "broad" as const, label: "Broad", color: "#F0F4FF", textColor: "#5B6AC4" },
                      { key: "engagement" as const, label: "Engagement", color: "#F0FDF4", textColor: "#16A34A" },
                    ].map(({ key, label, color, textColor }) => (
                      <div key={key} className="rounded-xl border p-3" style={{ borderColor: "#E5DDD5" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium" style={{ color: "#8A7060" }}>{label}</span>
                          <CopyButton text={reelCaption.hashtags[key].join(" ")} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {reelCaption.hashtags[key].map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: color, color: textColor }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <CopyButton
                      text={[...reelCaption.hashtags.niche, ...reelCaption.hashtags.broad, ...reelCaption.hashtags.engagement].join(" ")}
                      label="Copy all hashtags"
                    />
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
