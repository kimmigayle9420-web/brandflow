"use client"

import { Instagram, Twitter, Youtube, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Platform {
  id: string
  label: string
  icon: React.ElementType | null
  iconBg: string
  iconColor: string
  emoji?: string
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    iconBg: "#FDE8F0",
    iconColor: "#C2185B",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: null,
    iconBg: "#E8F8F8",
    iconColor: "#00796B",
    emoji: "🎵",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    iconBg: "#FEECEC",
    iconColor: "#D32F2F",
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: Twitter,
    iconBg: "#E8F4FE",
    iconColor: "#1565C0",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    iconBg: "#E8F0FE",
    iconColor: "#1A53A0",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: null,
    iconBg: "#FEECEC",
    iconColor: "#C62828",
    emoji: "📌",
  },
]

interface SocialConnectProps {
  connectedPlatforms?: string[]
}

export function SocialConnect({ connectedPlatforms = [] }: SocialConnectProps) {
  const platforms = PLATFORMS.map((p) => ({
    ...p,
    connected: connectedPlatforms.includes(p.id),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#2D1810" }}>
            Social Accounts
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#8A7060" }}>
            Connect your platforms to schedule and publish content
          </p>
        </div>
        {connectedPlatforms.length > 0 && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "#E8F5E9", color: "#2E7D32" }}
          >
            {connectedPlatforms.length} connected
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {platforms.map((platform) => {
          const Icon = platform.icon
          return (
            <div
              key={platform.id}
              className="flex items-center gap-2.5 p-3.5 rounded-2xl border transition-all"
              style={{
                backgroundColor: platform.connected ? "#F0FDF4" : "#FFFCF8",
                borderColor: platform.connected ? "#BBF7D0" : "#E8E0D5",
              }}
            >
              {/* Platform icon */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0 text-sm"
                style={{ backgroundColor: platform.iconBg }}
              >
                {Icon ? (
                  <Icon className="h-4 w-4" style={{ color: platform.iconColor }} />
                ) : (
                  <span>{platform.emoji}</span>
                )}
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#2D1810" }}>
                  {platform.label}
                </p>
                <p className="text-xs" style={{ color: platform.connected ? "#2E7D32" : "#A89080" }}>
                  {platform.connected ? "Connected" : "Not connected"}
                </p>
              </div>

              {/* Action button */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2 shrink-0 rounded-lg"
                style={
                  platform.connected
                    ? { color: "#8A7060" }
                    : { color: "#F97066", fontWeight: 500 }
                }
              >
                {platform.connected ? "Manage" : "Connect"}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
