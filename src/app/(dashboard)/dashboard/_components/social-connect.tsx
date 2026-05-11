"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveSocialHandle } from "../_actions/social-accounts"

const platforms = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    bg: "bg-gradient-to-br from-pink-500 to-orange-400",
    placeholder: "@yourhandle",
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    bg: "bg-gradient-to-br from-slate-800 to-slate-900",
    placeholder: "@yourhandle",
  },
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    bg: "bg-gradient-to-br from-red-500 to-red-600",
    placeholder: "Channel URL or @handle",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "𝕏",
    bg: "bg-gradient-to-br from-slate-700 to-slate-900",
    placeholder: "@yourhandle",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    bg: "bg-gradient-to-br from-rose-500 to-red-600",
    placeholder: "@yourhandle",
  },
  {
    id: "facebook",
    name: "Facebook",
    emoji: "👥",
    bg: "bg-gradient-to-br from-blue-500 to-blue-700",
    placeholder: "Page URL or name",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    emoji: "💼",
    bg: "bg-gradient-to-br from-blue-700 to-blue-800",
    placeholder: "Profile URL",
  },
]

export function SocialConnect({
  initialAccounts = {},
}: {
  initialAccounts?: Record<string, string>
}) {
  const [accounts, setAccounts] = useState<Record<string, string>>(initialAccounts)
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openInput = (platformId: string) => {
    setExpandedPlatform(platformId)
    setInputValue(accounts[platformId] ?? "")
    setSaveError(null)
  }

  const closeInput = () => {
    setExpandedPlatform(null)
    setInputValue("")
    setSaveError(null)
  }

  const handleSave = (platformId: string) => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    setSaveError(null)

    startTransition(async () => {
      try {
        const result = await saveSocialHandle(platformId, trimmed)
        setAccounts(result.accounts)
        closeInput()
      } catch (err: any) {
        setSaveError(err.message ?? "Failed to save. Please try again.")
      }
    })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-start">
      {platforms.map((platform) => {
        const connected = accounts[platform.id]
        const isExpanded = expandedPlatform === platform.id

        return (
          <Card
            key={platform.id}
            className="bg-white shadow-sm border-0 ring-1 ring-slate-100 hover:ring-indigo-200 hover:shadow-md transition-all duration-200 group"
          >
            <CardContent className="flex flex-col items-center gap-2.5 py-4 px-2">
              {/* Icon — smaller, supporting role */}
              <div
                className={`w-9 h-9 rounded-xl ${platform.bg} flex items-center justify-center text-sm shadow-sm shrink-0`}
              >
                <span role="img" aria-label={platform.name}>
                  {platform.emoji}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700 text-center leading-tight">
                {platform.name}
              </p>

              {/* States: expanded input / connected / disconnected */}
              {isExpanded ? (
                <div className="w-full space-y-1.5">
                  <Input
                    autoFocus
                    placeholder={platform.placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isPending) handleSave(platform.id)
                      if (e.key === "Escape") closeInput()
                    }}
                    className="h-7 text-[11px] px-2 border-slate-200 focus-visible:ring-indigo-400"
                  />
                  {saveError && (
                    <p className="text-[10px] text-red-500 leading-tight px-0.5">{saveError}</p>
                  )}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      disabled={isPending || !inputValue.trim()}
                      onClick={() => handleSave(platform.id)}
                      className="flex-1 h-6 text-[11px] bg-indigo-600 hover:bg-indigo-700 px-1"
                    >
                      {isPending ? (
                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={closeInput}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ) : connected ? (
                <div className="w-full space-y-0.5 text-center">
                  <p className="text-[11px] font-semibold text-green-600">✓ Connected</p>
                  <p className="text-[10px] text-slate-400 truncate px-1">{connected}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openInput(platform.id)}
                    className="h-5 text-[10px] text-slate-400 hover:text-indigo-600 p-0 w-full"
                  >
                    Edit
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors"
                  onClick={() => openInput(platform.id)}
                >
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
