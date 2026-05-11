"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Search, Target, Users, Lightbulb, TrendingUp,
  MessageSquare, Hash, Loader2, Sparkles
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

type NicheFramework = {
  niche: string
  coreProblem: string
  targetPersona: {
    name: string
    age: string
    pain: string
    desire: string
  }
  contentPillars: string[]
  contentFormats: string[]
  keyMessages: string[]
  hashtagClusters: string[][]
  platforms: string[]
  postingFrequency: string
}

// ── API call ─────────────────────────────────────────────────────────────────

async function generateNicheFramework(nicheInput: string): Promise<NicheFramework> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "niche_framework", nicheInput }),
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Generation failed")
  }

  // The API returns raw JSON in data.result
  const raw: string = data.result
  // Strip any accidental markdown fences just in case
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
  const parsed = JSON.parse(cleaned) as NicheFramework
  return parsed
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NicheResearchPage() {
  const { toast } = useToast()
  const [niche, setNiche] = useState("")
  const [framework, setFramework] = useState<NicheFramework | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!niche.trim()) return
    setLoading(true)
    setError(null)
    setFramework(null)

    try {
      const result = await generateNicheFramework(niche.trim())
      setFramework(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      setError(msg)
      toast({
        title: "Generation failed",
        description: msg.includes("ANTHROPIC_API_KEY")
          ? "Add your ANTHROPIC_API_KEY to .env.local to enable AI features."
          : msg,
        variant: "destructive",
      })
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleGenerate()
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b bg-white px-8 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Niche Research</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Enter your niche and Claude will build you a tailored brand & content framework
        </p>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">

        {/* Input card */}
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="niche" className="text-sm font-medium">Your Niche or Industry</Label>
              <div className="flex gap-3">
                <Input
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Sustainable fitness for busy mums, Personal finance for millennials…"
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={!niche.trim() || loading}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2 shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Powered by Claude AI. Try niches like: holistic dog nutrition, AI productivity for freelancers,
                budget travel for solo women, sustainable streetwear…
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <Card className="max-w-2xl border-indigo-200">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-800">Claude is researching your niche…</p>
                <p className="text-sm text-slate-500 mt-1">Building persona, content pillars, hashtag strategy and more</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && !loading && (
          <Card className="max-w-2xl border-red-200 bg-red-50">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-red-700 mb-1">Generation failed</p>
              <p className="text-sm text-red-600">{error}</p>
              {error.includes("ANTHROPIC_API_KEY") && (
                <p className="text-xs text-red-500 mt-2">
                  Get your API key at{" "}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">
                    console.anthropic.com
                  </a>{" "}
                  and add it to your <code className="bg-red-100 px-1 rounded">.env.local</code> file.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Framework output */}
        {framework && !loading && (
          <div className="space-y-5 max-w-4xl">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-slate-800">
                Framework: <span className="text-indigo-600">{framework.niche}</span>
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGenerate}
                className="ml-auto text-slate-400 hover:text-slate-600 gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Core Problem */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    Core Problem You Solve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{framework.coreProblem}</p>
                </CardContent>
              </Card>

              {/* Target Persona */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Target Persona: {framework.targetPersona.name}
                  </CardTitle>
                  <CardDescription>Age: {framework.targetPersona.age}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">😣 Pain Point</p>
                    <p className="text-sm text-slate-700">{framework.targetPersona.pain}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">✨ Core Desire</p>
                    <p className="text-sm text-slate-700">{framework.targetPersona.desire}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Content Pillars */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Recommended Content Pillars
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {framework.contentPillars.map((pillar, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                        <span className="text-sm text-slate-700">{pillar}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Content Formats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Best Content Formats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {framework.contentFormats.map((format, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
                        <span className="text-sm text-slate-700">{format}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Messages */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    Key Messaging Angles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {framework.keyMessages.map((msg, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-slate-400 text-sm shrink-0">{i + 1}.</span>
                        <span className="text-sm text-slate-700 italic">&ldquo;{msg}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Platform + Frequency */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Platform Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Recommended Platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {framework.platforms.map((p) => (
                        <Badge key={p} variant="secondary">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Posting Frequency</p>
                    <p className="text-sm text-slate-700">{framework.postingFrequency}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hashtag Clusters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-indigo-500" />
                  Hashtag Strategy Clusters
                </CardTitle>
                <CardDescription>Rotate between these clusters across your posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {framework.hashtagClusters.map((cluster, i) => (
                    <div key={i}>
                      <p className="text-xs font-medium text-slate-400 mb-2">Cluster {i + 1}</p>
                      <div className="flex flex-wrap gap-2">
                        {cluster.map((tag) => (
                          <span
                            key={tag}
                            className="text-sm px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium cursor-pointer hover:bg-indigo-100 transition-colors"
                            onClick={() => navigator.clipboard.writeText(tag).catch(() => {})}
                            title="Click to copy"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-2">💡 Click any hashtag to copy it</p>
                </div>
              </CardContent>
            </Card>

            {/* CTA to use pillars */}
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardContent className="py-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-indigo-900 text-sm">Ready to use this framework?</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Create a brand with this niche, then add these pillars to your Content Pillars page.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
                    <a href="/brands/new">Create Brand</a>
                  </Button>
                  <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <a href="/content-pillars">Add Pillars</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
