"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type ResearchCard = {
  title: string
  description: string
  tag: "trending" | "evergreen" | "seasonal"
  tagLabel: string
}

function buildCards(niche: string): ResearchCard[] {
  const n = niche ? niche.charAt(0).toUpperCase() + niche.slice(1) : "Your niche"
  return [
    {
      title: `Short-Form Video Is Dominating ${n} Content`,
      description:
        "Reels and TikToks in this space are getting 3–5× more reach than static posts. Showing up consistently on short-form will compound over time.",
      tag: "trending",
      tagLabel: "🔥 Trending",
    },
    {
      title: "Behind-the-Scenes Builds Trust Faster Than Polished Content",
      description:
        "Audiences connect more when creators show the messy middle — the process, not just the result. Authenticity outperforms production value.",
      tag: "evergreen",
      tagLabel: "💡 Evergreen",
    },
    {
      title: `How-To & Tutorial Posts Drive Saves in ${n}`,
      description:
        "Educational content consistently ranks among top performers for saves and shares. Saves signal algorithm intent better than likes.",
      tag: "evergreen",
      tagLabel: "💡 Evergreen",
    },
    {
      title: "Newsletter Growth Is Accelerating Across Niches",
      description:
        "A weekly digest builds a direct line to your most loyal followers — independent of any platform algorithm changes.",
      tag: "trending",
      tagLabel: "🔥 Trending",
    },
    {
      title: "Seasonal Content Planning Boosts Relevance",
      description:
        "Map your content calendar to upcoming events, cultural moments, and seasonal trends to stay timely without scrambling last-minute.",
      tag: "seasonal",
      tagLabel: "📅 Seasonal",
    },
    {
      title: "Collaborations Expand Reach Without Paid Ads",
      description:
        `Co-created content with complementary creators in the ${n.toLowerCase()} space can dramatically grow your audience organically.`,
      tag: "evergreen",
      tagLabel: "💡 Evergreen",
    },
  ]
}

const tagStyles: Record<ResearchCard["tag"], string> = {
  trending: "bg-[#EDE6DC] text-[#C45A26] border-[#C45A26]",
  evergreen: "bg-emerald-50 text-emerald-600 border-emerald-200",
  seasonal: "bg-blue-50 text-blue-600 border-blue-200",
}

export function NicheResearch({ niche }: { niche: string }) {
  const [cards, setCards] = useState<ResearchCard[]>(() => buildCards(niche))
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setCards([...buildCards(niche)].sort(() => Math.random() - 0.5))
      setRefreshing(false)
    }, 700)
  }, [niche])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={refreshing}
          className="text-slate-500 hover:text-slate-700 h-8 gap-1.5"
        >
          <span
            className={`inline-block transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`}
          >
            ↻
          </span>
          {refreshing ? "Refreshing…" : "Refresh ideas"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <Card
            key={i}
            className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:shadow-md hover:ring-indigo-100 transition-all duration-200"
          >
            <CardContent className="p-5 flex flex-col gap-3 h-full">
              <h4 className="text-sm font-semibold text-slate-800 leading-snug">{card.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed flex-1">{card.description}</p>
              <span
                className={`self-start inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${tagStyles[card.tag]}`}
              >
                {card.tagLabel}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
