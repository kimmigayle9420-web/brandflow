"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles,
  RefreshCw,
  Trash2,
  Globe,
  Search,
  ChevronRight,
  Target,
  Users,
  TrendingUp,
  Lightbulb,
  Layers,
  Save,
} from "lucide-react"
import type { Brand, ContentPillar } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type GeneratedPillar = {
  name: string
  emoji: string
  description: string
  postIdeas: string[]
}

type ProfileAnalysis = {
  niche: string
  contentThemes: string[]
  postingStyle: string
  targetAudience: string
  topTopics: string[]
  brandVoice: string
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

const PILLAR_COLORS = [
  "#f97316", "#ec4899", "#8b5cf6", "#6366f1",
  "#14b8a6", "#22c55e", "#eab308", "#f43f5e",
  "#0ea5e9", "#64748b",
]

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-[#EDE6DC] text-[#C45A26] border-[#C45A26]",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-slate-50 text-slate-500 border-slate-200",
}

// ─── Local-storage helpers ────────────────────────────────────────────────────

const LS_PROFILE_KEY = "brandflow:profile-analyser"
const LS_NICHE_KEY = "brandflow:niche-research"

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE6DC] text-[#E06A33] shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="border-t border-slate-100 my-10" />
}

// ─── Root client component ────────────────────────────────────────────────────

export function ContentResearchClient({
  brand,
  initialPillars,
}: {
  brand: Brand | null
  initialPillars: ContentPillar[]
}) {
  return (
    <div>
      <PillarsSection brand={brand} initialPillars={initialPillars} />
      <SectionDivider />
      <ProfileAnalyserSection brand={brand} />
      <SectionDivider />
      <NicheResearchSection defaultNiche={brand?.niche ?? ""} />
    </div>
  )
}

// ─── 1. Content Pillars Generator ────────────────────────────────────────────

function PillarsSection({
  brand,
  initialPillars,
}: {
  brand: Brand | null
  initialPillars: ContentPillar[]
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [niche, setNiche] = useState(brand?.niche ?? "")
  const [generated, setGenerated] = useState<GeneratedPillar[]>([])
  const [savedPillars, setSavedPillars] = useState<ContentPillar[]>(initialPillars)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable card fields
  const [editedPillars, setEditedPillars] = useState<GeneratedPillar[]>([])

  useEffect(() => {
    setEditedPillars(generated)
  }, [generated])

  const updateField = (
    index: number,
    field: keyof Pick<GeneratedPillar, "name" | "emoji" | "description">,
    value: string
  ) => {
    setEditedPillars((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }

  const generate = useCallback(async () => {
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
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [niche])

  const savePillars = async () => {
    if (!brand?.id || editedPillars.length === 0) return
    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({ title: "Not logged in", variant: "destructive" })
      setSaving(false)
      return
    }

    const inserts = editedPillars.map((p, i) => ({
      brand_id: brand.id,
      user_id: user.id,
      name: `${p.emoji} ${p.name}`.trim(),
      description: p.description || null,
      color: PILLAR_COLORS[i % PILLAR_COLORS.length],
      sort_order: savedPillars.length + i,
    }))

    const { data: inserted, error: dbError } = await supabase
      .from("content_pillars")
      .insert(inserts)
      .select()

    if (dbError) {
      toast({ title: "Failed to save pillars", description: dbError.message, variant: "destructive" })
    } else {
      setSavedPillars((prev) => [...prev, ...(inserted ?? [])])
      setGenerated([])
      toast({ title: `${editedPillars.length} pillars saved!` })
    }
    setSaving(false)
  }

  const deletePillar = async (pillarId: string) => {
    const { error } = await supabase.from("content_pillars").delete().eq("id", pillarId)
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" })
    } else {
      setSavedPillars((prev) => prev.filter((p) => p.id !== pillarId))
      toast({ title: "Pillar deleted" })
    }
  }

  return (
    <section>
      <SectionHeader
        icon={<Layers className="h-4 w-4" />}
        title="Content Pillars Generator"
        subtitle="Generate 5 AI-powered content pillars for your niche, edit them, then save to your brand."
      />

      {/* Input row */}
      <div className="flex gap-3 max-w-2xl">
        <Input
          placeholder="Enter your niche (e.g. sustainable fashion, fitness for mums)"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
          className="bg-white border-slate-200 h-11 focus-visible:ring-[#E06A33] shadow-sm"
        />
        <Button
          onClick={generate}
          disabled={loading || !niche.trim()}
          className="bg-[#E06A33] hover:bg-[#C45A26] h-11 px-6 shrink-0 font-medium shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Pillars
            </span>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 max-w-2xl">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-white border-0 ring-1 ring-slate-100 shadow-sm animate-pulse rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-2 bg-slate-50 rounded w-full" />
                <div className="h-2 bg-slate-50 rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generated pillars — editable */}
      {editedPillars.length > 0 && !loading && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              {editedPillars.length} pillars generated — edit below, then save
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generate}
                className="h-8 gap-1.5 text-slate-500 border-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              {brand?.id && (
                <Button
                  size="sm"
                  onClick={savePillars}
                  disabled={saving}
                  className="h-8 bg-[#E06A33] hover:bg-[#C45A26] px-4 gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Pillars
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {editedPillars.map((pillar, i) => (
              <Card
                key={i}
                className="bg-white border-0 ring-1 ring-slate-100 shadow-sm hover:shadow-md hover:ring-[#C2B5A3] transition-all duration-200 rounded-2xl"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={pillar.emoji}
                      onChange={(e) => updateField(i, "emoji", e.target.value)}
                      className="text-2xl w-10 bg-transparent border-none outline-none cursor-text"
                      maxLength={2}
                      aria-label="Pillar emoji"
                    />
                    <input
                      value={pillar.name}
                      onChange={(e) => updateField(i, "name", e.target.value)}
                      className="flex-1 text-sm font-bold text-slate-800 bg-transparent border-none outline-none focus:bg-slate-50 rounded px-1 -mx-1 py-0.5"
                      aria-label="Pillar name"
                    />
                  </div>
                  <Textarea
                    value={pillar.description}
                    onChange={(e) => updateField(i, "description", e.target.value)}
                    className="text-xs text-slate-500 leading-relaxed bg-transparent border-slate-100 focus-visible:ring-[#C45A26] resize-none min-h-0"
                    rows={3}
                    aria-label="Pillar description"
                  />
                  {pillar.postIdeas?.length > 0 && (
                    <ul className="space-y-1 pt-1 border-t border-slate-50">
                      {pillar.postIdeas.map((idea, j) => (
                        <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-[#E06A33] mt-0.5 shrink-0">→</span>
                          <span>{idea}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {!brand?.id && (
            <p className="text-xs text-slate-400">
              <a href="/brands/new" className="text-[#E06A33] hover:underline">
                Create a brand first
              </a>{" "}
              to save pillars.
            </p>
          )}
        </div>
      )}

      {/* Saved pillars */}
      {savedPillars.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Saved Pillars ({savedPillars.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {savedPillars.map((pillar) => (
              <div
                key={pillar.id}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all"
                style={{
                  backgroundColor: pillar.color + "15",
                  color: pillar.color,
                  borderColor: pillar.color + "40",
                }}
              >
                <span>{pillar.name}</span>
                <button
                  onClick={() => deletePillar(pillar.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-500"
                  aria-label={`Delete ${pillar.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when nothing generated or saved */}
      {editedPillars.length === 0 && savedPillars.length === 0 && !loading && (
        <Card className="mt-6 bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-3">🧩</div>
            <p className="text-sm font-medium text-slate-600 mb-1">No pillars yet</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Enter your niche above and generate 5 AI-powered content pillars to guide your posting strategy.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

// ─── 2. Profile / Website Analyser ───────────────────────────────────────────

function ProfileAnalyserSection({ brand }: { brand: Brand | null }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [url, setUrl] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return lsGet<{ url: string; result: ProfileAnalysis }>(LS_PROFILE_KEY)?.url ?? ""
  })
  const [result, setResult] = useState<ProfileAnalysis | null>(() => {
    if (typeof window === "undefined") return null
    return lsGet<{ url: string; result: ProfileAnalysis }>(LS_PROFILE_KEY)?.result ?? null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingToBrand, setSavingToBrand] = useState(false)

  const analyse = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
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
      lsSet(LS_PROFILE_KEY, { url: trimmed, result: data })
    } catch (err: any) {
      setError(err.message ?? "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const saveToBrand = async () => {
    if (!brand?.id || !result) return
    setSavingToBrand(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast({ title: "Not logged in", variant: "destructive" })
      setSavingToBrand(false)
      return
    }

    const updates: Partial<Omit<Brand, "id" | "user_id" | "created_at">> = {}
    if (result.niche && !brand.niche) updates.niche = result.niche
    if (result.targetAudience && !brand.target_audience)
      updates.target_audience = result.targetAudience
    if (result.brandVoice && !brand.tone_of_voice)
      updates.tone_of_voice = result.brandVoice

    const { error: dbError } = await supabase
      .from("brands")
      .update(updates)
      .eq("id", brand.id)

    if (dbError) {
      toast({ title: "Failed to update brand", description: dbError.message, variant: "destructive" })
    } else {
      toast({ title: "Brand updated with insights!" })
    }
    setSavingToBrand(false)
  }

  return (
    <section>
      <SectionHeader
        icon={<Globe className="h-4 w-4" />}
        title="Profile / Website Analyser"
        subtitle="Paste any profile URL or website and Claude will extract brand intelligence instantly."
      />

      {/* Input row */}
      <div className="flex gap-3 max-w-2xl">
        <Input
          placeholder="Paste a URL (e.g. instagram.com/someone, example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && analyse()}
          className="bg-white border-slate-200 h-11 focus-visible:ring-[#E06A33] shadow-sm"
        />
        <Button
          onClick={analyse}
          disabled={loading || !url.trim()}
          className="bg-[#E06A33] hover:bg-[#C45A26] h-11 px-6 shrink-0 font-medium shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analysing…
            </span>
          ) : (
            "Analyse"
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 max-w-2xl">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-white border-0 ring-1 ring-slate-100 shadow-sm animate-pulse rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                <div className="h-2 bg-slate-50 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">Analysis results</p>
            {brand?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={saveToBrand}
                disabled={savingToBrand}
                className="h-8 gap-1.5 border-[#C45A26] text-[#C45A26] hover:bg-[#EDE6DC]"
              >
                {savingToBrand ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save to Brand
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Niche */}
            <ResultCard icon="🎯" label="Niche">
              <p className="text-sm font-semibold text-slate-800">{result.niche}</p>
            </ResultCard>

            {/* Brand Voice */}
            <ResultCard icon="🎙️" label="Brand Voice">
              <p className="text-sm font-semibold text-slate-800">{result.brandVoice}</p>
            </ResultCard>

            {/* Posting Style */}
            <ResultCard icon="✍️" label="Posting Style">
              <p className="text-sm text-slate-600 leading-relaxed">{result.postingStyle}</p>
            </ResultCard>

            {/* Target Audience */}
            <ResultCard icon="👥" label="Target Audience">
              <p className="text-sm text-slate-600 leading-relaxed">{result.targetAudience}</p>
            </ResultCard>

            {/* Content Themes */}
            <ResultCard icon="🏷️" label="Content Themes">
              <div className="flex flex-wrap gap-1.5">
                {result.contentThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-[#EDE6DC] text-[#C45A26] border border-[#C2B5A3]"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </ResultCard>

            {/* Top Topics */}
            <ResultCard icon="🔥" label="Top Topics">
              <ul className="space-y-1">
                {result.topTopics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="text-[#E06A33] font-bold mt-px shrink-0">·</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </ResultCard>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <Card className="mt-6 bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm font-medium text-slate-600 mb-1">No analysis yet</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Paste any Instagram, TikTok, or website URL above and we'll extract their brand strategy.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

// ─── Shared result card ───────────────────────────────────────────────────────

function ResultCard({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm hover:shadow-md hover:ring-[#C2B5A3] transition-all duration-200 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-sm">{icon}</span>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {label}
          </p>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

// ─── 3. Niche Research ────────────────────────────────────────────────────────

function NicheResearchSection({ defaultNiche }: { defaultNiche: string }) {
  const [topic, setTopic] = useState<string>(() => {
    if (typeof window === "undefined") return defaultNiche
    return lsGet<{ topic: string; result: NicheResearchResult }>(LS_NICHE_KEY)?.topic ?? defaultNiche
  })
  const [result, setResult] = useState<NicheResearchResult | null>(() => {
    if (typeof window === "undefined") return null
    return lsGet<{ topic: string; result: NicheResearchResult }>(LS_NICHE_KEY)?.result ?? null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const research = async () => {
    const trimmed = topic.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/research-niche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Research failed")
      setResult(data)
      lsSet(LS_NICHE_KEY, { topic: trimmed, result: data })
    } catch (err: any) {
      setError(err.message ?? "Research failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <SectionHeader
        icon={<Search className="h-4 w-4" />}
        title="Niche Research"
        subtitle="Dive deep into any niche — content angles, audience pain points, trending topics, best formats, and competitor gaps."
      />

      {/* Input row */}
      <div className="flex gap-3 max-w-2xl">
        <Input
          placeholder="Enter a niche or topic to research (e.g. plant-based fitness)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && research()}
          className="bg-white border-slate-200 h-11 focus-visible:ring-[#E06A33] shadow-sm"
        />
        <Button
          onClick={research}
          disabled={loading || !topic.trim()}
          className="bg-[#E06A33] hover:bg-[#C45A26] h-11 px-6 shrink-0 font-medium shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Researching…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Research
            </span>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 max-w-2xl">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-6 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EDE6DC] flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-[#E06A33] animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-700">Claude is researching your niche…</p>
          <p className="text-xs text-slate-400 mt-1">
            Analysing content angles, audience pain points, trends and more
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-6 space-y-6">

          {/* Row 1: Content Angles + Pain Points */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Content Angles */}
            <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Top 5 Content Angles</h3>
                </div>
                <div className="space-y-3">
                  {result.contentAngles.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {item.angle}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {item.rationale}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Audience Pain Points */}
            <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Audience Pain Points</h3>
                </div>
                <ul className="space-y-2.5">
                  {result.painPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-rose-400 shrink-0 mt-0.5">😣</span>
                      <span className="text-sm text-slate-600 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Trending Topics */}
          <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE6DC] text-[#E06A33]">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Trending Topics Right Now</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.trendingTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#EDE6DC] text-[#C45A26] border border-[#C2B5A3]"
                  >
                    <span className="text-xs">🔥</span>
                    {topic}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Posting Formats + Content Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Best Posting Formats */}
            <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Best Posting Formats</h3>
                </div>
                <div className="space-y-3">
                  {result.postingFormats.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <ChevronRight className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{item.format}</p>
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.low}`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {item.reasoning}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Gaps */}
            <Card className="bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">Competitor Content Gaps</h3>
                  <span className="text-xs text-slate-400 ml-auto">What&apos;s underserved</span>
                </div>
                <ul className="space-y-2.5">
                  {result.contentGaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 shrink-0 mt-0.5">✦</span>
                      <span className="text-sm text-slate-600 leading-relaxed">{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <Card className="mt-6 bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-3">🔬</div>
            <p className="text-sm font-medium text-slate-600 mb-1">No research yet</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Enter any niche or topic and Claude will analyse content opportunities, audience needs, and more.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
