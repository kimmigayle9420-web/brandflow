"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Pillar = {
  name: string
  description: string
  emoji: string
  examples: string[]
}

export function PillarsGenerator({ defaultNiche }: { defaultNiche: string }) {
  const [niche, setNiche] = useState(defaultNiche)
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      setPillars(data.pillars)
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Input row */}
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

      {error && (
        <p className="text-sm text-red-500 px-1">{error}</p>
      )}

      {/* Results */}
      {pillars.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {pillars.map((pillar, i) => (
            <Card
              key={i}
              className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200"
            >
              <CardContent className="p-5 space-y-3">
                <div className="text-2xl">{pillar.emoji}</div>
                <h4 className="text-sm font-bold text-slate-800 leading-snug">{pillar.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{pillar.description}</p>
                {pillar.examples?.length > 0 && (
                  <ul className="space-y-1.5 pt-1 border-t border-slate-50">
                    {pillar.examples.map((ex, j) => (
                      <li key={j} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !loading && (
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <div className="text-4xl mb-3">🧩</div>
              <p className="text-sm font-medium text-slate-600 mb-1">No pillars yet</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Enter your niche above and hit "Generate Pillars" to get 5 AI-powered content pillars tailored to your brand.
              </p>
            </CardContent>
          </Card>
        )
      )}

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
