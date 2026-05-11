"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const platforms = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    bg: "bg-gradient-to-br from-pink-500 to-orange-400",
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    bg: "bg-gradient-to-br from-slate-800 to-slate-900",
  },
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    bg: "bg-gradient-to-br from-red-500 to-red-600",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "𝕏",
    bg: "bg-gradient-to-br from-slate-700 to-slate-900",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    bg: "bg-gradient-to-br from-rose-500 to-red-600",
  },
  {
    id: "facebook",
    name: "Facebook",
    emoji: "👥",
    bg: "bg-gradient-to-br from-blue-500 to-blue-700",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    emoji: "💼",
    bg: "bg-gradient-to-br from-blue-700 to-blue-800",
  },
]

export function SocialConnect() {
  const { toast } = useToast()

  const handleConnect = (platformName: string) => {
    toast({
      title: `${platformName} — Coming Soon! 🚀`,
      description:
        "Social platform integrations are on the roadmap. Stay tuned for the next release!",
      duration: 3000,
    })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {platforms.map((platform) => (
        <Card
          key={platform.id}
          className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:ring-indigo-200 hover:shadow-md transition-all duration-200 group"
        >
          <CardContent className="flex flex-col items-center gap-3 py-5 px-2">
            <div
              className={`w-11 h-11 rounded-xl ${platform.bg} flex items-center justify-center text-lg shadow-sm`}
            >
              <span role="img" aria-label={platform.name}>
                {platform.emoji}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700 text-center leading-tight">
              {platform.name}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors"
              onClick={() => handleConnect(platform.name)}
            >
              Connect
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
