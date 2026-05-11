"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ProfileAnalysis = {
  niche: string
  contentThemes: string[]
  postingStyle: string
  targetAudience: string
  topTopics: string[]
  brandVoice: string
}

export function ProfileResearch() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProfileAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      if (!res.ok) {
        setError(data.error ?? "Analysis failed. Please try again.")
      } else {
        setResult(data)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* URL input row */}
      <div className="flex gap-2">
        <Input
          placeholder="Paste a profile URL or website (e.g. instagram.com/someone, example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) analyse()
          }}
          className="flex-1 h-10 text-sm border-slate-200 focus-visible:ring-indigo-400"
        />
        <Button
          onClick={analyse}
          disabled={loading || !url.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 h-10 px-5 font-medium text-sm shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analysing…
            </span>
          ) : (
            "Analyse"
          )}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results grid */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Niche */}
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">🎯</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Niche
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-800">{result.niche}</p>
            </CardContent>
          </Card>

          {/* Brand Voice */}
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">🎙️</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Brand Voice
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-800">{result.brandVoice}</p>
            </CardContent>
          </Card>

          {/* Posting Style */}
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">✍️</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Posting Style
                </p>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{result.postingStyle}</p>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">👥</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Target Audience
                </p>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{result.targetAudience}</p>
            </CardContent>
          </Card>

          {/* Content Themes */}
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-sm">🏷️</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Content Themes
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.contentThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Topics */}
          <Card className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-sm">🔥</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Top Topics
                </p>
              </div>
              <ul className="space-y-1">
                {result.topTopics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="text-indigo-400 font-bold mt-px shrink-0">·</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
