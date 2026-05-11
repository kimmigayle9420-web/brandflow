"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Sparkles, PenLine } from "lucide-react"

type Pillar = {
  name: string
  description: string
  emoji: string
  postIdeas: string[]
  source: "ai" | "manual"
}

const PILLAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#64748b",
]

export function PillarsGenerator({
  defaultNiche,
  brandId,
}: {
  defaultNiche: string
  brandId?: string
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai")
  const [niche, setNiche] = useState(defaultNiche)
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Manual form state
  const [manualName, setManualName] = useState("")
  const [manualDesc, setManualDesc] = useState("")
  const [manualIdeas, setManualIdeas] = useState<string[]>([""])

  // ── AI generate ─────────────────────────────────────────────────────────────
  const generate = async () => {
    const trimmed = niche.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/generate-pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed")
      }

      const aiPillars: Pillar[] = data.pillars.map((p: Omit<Pillar, "source">) => ({
        ...p,
        source: "ai",
      }))
      setPillars(aiPillars)
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Add manual pillar ────────────────────────────────────────────────────────
  const addManualPillar = () => {
    if (!manualName.trim()) return
    const newPillar: Pillar = {
      name: manualName.trim(),
      description: manualDesc.trim(),
      emoji: "✍️",
      postIdeas: manualIdeas.filter((i) => i.trim()),
      source: "manual",
    }
    setPillars((prev) => [...prev, newPillar])
    setManualName("")
    setManualDesc("")
    setManualIdeas([""])
    toast({ title: "Pillar added!" })
  }

  const updateIdea = (index: number, value: string) => {
    setManualIdeas((prev) => prev.map((idea, i) => (i === index ? value : idea)))
  }

  const addIdeaField = () => setManualIdeas((prev) => [...prev, ""])

  const removeIdeaField = (index: number) =>
    setManualIdeas((prev) => prev.filter((_, i) => i !== index))

  const removePillar = (index: number) =>
    setPillars((prev) => prev.filter((_, i) => i !== index))

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const saveToSupabase = async () => {
    if (!brandId || pillars.length === 0) return
    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({ title: "Not logged in", variant: "destructive" })
      setSaving(false)
      return
    }

    const inserts = pillars.map((p, i) => ({
      brand_id: brandId,
      user_id: user.id,
      name: `${p.emoji} ${p.name}`.trim(),
      description: p.description || null,
      color: PILLAR_COLORS[i % PILLAR_COLORS.length],
      sort_order: i,
    }))

    const { error: dbError } = await supabase.from("content_pillars").insert(inserts)

    if (dbError) {
      toast({ title: "Failed to save pillars", description: dbError.message, variant: "destructive" })
    } else {
      toast({
        title: `${pillars.length} pillar${pillars.length !== 1 ? "s" : ""} saved to your brand!`,
        description: "View them in Content Pillars.",
      })
    }
    setSaving(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "ai"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate with AI
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "manual"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" />
          Create manually
        </button>
      </div>

      {/* ── AI tab ── */}
      {activeTab === "ai" && (
        <div className="flex gap-3">
          <Input
            placeholder="Enter your niche (e.g. fitness, travel, personal finance)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
            className="bg-white shadow-sm border-slate-200 h-11 focus-visible:ring-indigo-500"
          />
          <Button
            onClick={generate}
            disabled={loading || !niche.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 shrink-0 font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </span>
            ) : (
              "Generate Pillars ✨"
            )}
          </Button>
        </div>
      )}

      {/* ── Manual tab ── */}
      {activeTab === "manual" && (
        <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pillar-name">Pillar name *</Label>
              <Input
                id="pillar-name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Behind the Scenes"
                className="border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pillar-desc">Description</Label>
              <Textarea
                id="pillar-desc"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="What kind of content belongs in this pillar?"
                rows={2}
                className="border-slate-200 focus-visible:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Post ideas</Label>
              <div className="space-y-2">
                {manualIdeas.map((idea, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={idea}
                      onChange={(e) => updateIdea(i, e.target.value)}
                      placeholder={`Post idea ${i + 1}`}
                      className="border-slate-200 focus-visible:ring-indigo-500"
                    />
                    {manualIdeas.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 text-slate-400 hover:text-red-500 hover:border-red-200"
                        onClick={() => removeIdeaField(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {i === manualIdeas.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 text-indigo-500 hover:text-indigo-700 hover:border-indigo-300"
                        onClick={addIdeaField}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={addManualPillar}
              disabled={!manualName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 mt-2"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Pillar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-500 px-1">{error}</p>}

      {/* ── Combined pillar cards ── */}
      {pillars.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-1">
            <p className="text-sm text-slate-500">
              {pillars.length} pillar{pillars.length !== 1 ? "s" : ""} ready
            </p>
            {brandId && (
              <Button
                onClick={saveToSupabase}
                disabled={saving}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 h-8 px-4"
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save to Brand"
                )}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {pillars.map((pillar, i) => (
              <Card
                key={i}
                className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200 group relative"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-2xl">{pillar.emoji}</div>
                    <button
                      onClick={() => removePillar(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 p-0.5"
                      aria-label="Remove pillar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">{pillar.name}</h4>
                  {pillar.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{pillar.description}</p>
                  )}
                  {pillar.postIdeas?.length > 0 && (
                    <ul className="space-y-1.5 pt-1 border-t border-slate-50">
                      {pillar.postIdeas.map((ex, j) => (
                        <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pillar.source === "manual" && (
                    <span className="inline-block text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                      manual
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {pillars.length === 0 && !loading && (
        <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="text-4xl mb-3">🧩</div>
            <p className="text-sm font-medium text-slate-600 mb-1">No pillars yet</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {activeTab === "ai"
                ? `Enter your niche above and hit "Generate Pillars" to get 5 AI-powered content pillars tailored to your brand.`
                : `Fill in the form above and click "Add Pillar" to build your content strategy manually.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-white shadow-sm border-0 ring-1 ring-slate-100 animate-pulse">
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
    </div>
  )
}
