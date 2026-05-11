"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveSocialHandle } from "../_actions/social-accounts"

type OAuthMessage =
  | { type: "setup"; url: string; envVar: string }
  | { type: "error"; message: string }

const platforms = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    bg: "bg-gradient-to-br from-pink-500 to-orange-400",
    placeholder: "@yourhandle",
    oauthColor:
      "bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:from-pink-600 hover:to-orange-500",
    devDocsUrl: "https://developers.facebook.com/docs/instagram-basic-display-api/",
    envVar: "INSTAGRAM",
    hasOAuth: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    bg: "bg-gradient-to-br from-slate-800 to-slate-900",
    placeholder: "@yourhandle",
    oauthColor: "bg-slate-900 text-white hover:bg-slate-800",
    devDocsUrl: "https://developers.tiktok.com/",
    envVar: "TIKTOK",
    hasOAuth: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    bg: "bg-gradient-to-br from-red-500 to-red-600",
    placeholder: "Channel URL or @handle",
    oauthColor: "bg-red-600 text-white hover:bg-red-700",
    devDocsUrl: "https://developers.google.com/youtube/v3",
    envVar: "YOUTUBE",
    hasOAuth: false,
  },
  {
    id: "twitter",
    name: "X / Twitter",
    emoji: "𝕏",
    bg: "bg-gradient-to-br from-slate-700 to-slate-900",
    placeholder: "@yourhandle",
    oauthColor: "bg-black text-white hover:bg-slate-800",
    devDocsUrl: "https://developer.twitter.com/en/portal/dashboard",
    envVar: "TWITTER",
    hasOAuth: false,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    bg: "bg-gradient-to-br from-rose-500 to-red-600",
    placeholder: "@yourhandle",
    oauthColor: "bg-red-600 text-white hover:bg-red-700",
    devDocsUrl: "https://developers.pinterest.com/",
    envVar: "PINTEREST",
    hasOAuth: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    emoji: "👥",
    bg: "bg-gradient-to-br from-blue-500 to-blue-700",
    placeholder: "Page URL or name",
    oauthColor: "bg-blue-600 text-white hover:bg-blue-700",
    devDocsUrl: "https://developers.facebook.com/",
    envVar: "INSTAGRAM", // Shares Meta OAuth with Instagram
    hasOAuth: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    emoji: "💼",
    bg: "bg-gradient-to-br from-blue-700 to-blue-800",
    placeholder: "Profile URL",
    oauthColor: "bg-blue-700 text-white hover:bg-blue-800",
    devDocsUrl: "https://developer.linkedin.com/",
    envVar: "LINKEDIN",
    hasOAuth: false,
  },
]

function buildProfileUrl(platformId: string, handle: string): string {
  const clean = handle.replace(/^@/, "")
  switch (platformId) {
    case "instagram": return `https://instagram.com/${clean}`
    case "tiktok":    return `https://tiktok.com/@${clean}`
    case "youtube":   return `https://youtube.com/@${clean}`
    case "twitter":   return `https://x.com/${clean}`
    case "pinterest": return `https://pinterest.com/${clean}`
    case "facebook":  return `https://facebook.com/${clean}`
    case "linkedin":  return `https://linkedin.com/in/${clean}`
    default:          return handle.startsWith("http") ? handle : `https://${handle}`
  }
}

export function SocialConnect({
  initialAccounts = {},
}: {
  initialAccounts?: Record<string, string>
}) {
  const [accounts, setAccounts] = useState<Record<string, string>>(initialAccounts)
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [oauthMessage, setOauthMessage] = useState<OAuthMessage | null>(null)
  const [isPending, startTransition] = useTransition()

  const openInput = (platformId: string) => {
    setExpandedPlatform(platformId)
    setInputValue(accounts[platformId] ?? "")
    setSaveError(null)
    setOauthMessage(null)
  }

  const closeInput = () => {
    setExpandedPlatform(null)
    setInputValue("")
    setSaveError(null)
    setOauthMessage(null)
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

  const handleOAuthConnect = async (platform: (typeof platforms)[0]) => {
    setOauthMessage(null)

    if (!platform.hasOAuth) {
      setOauthMessage({ type: "setup", url: platform.devDocsUrl, envVar: platform.envVar })
      return
    }

    // Instagram & Facebook share the Meta OAuth flow
    const endpoint = platform.id === "facebook" ? "instagram" : platform.id
    try {
      const res = await fetch(`/api/auth/${endpoint}/initiate`)
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.setup) {
        setOauthMessage({ type: "setup", url: platform.devDocsUrl, envVar: platform.envVar })
      } else {
        setOauthMessage({ type: "error", message: data.error ?? "OAuth initiation failed." })
      }
    } catch {
      setOauthMessage({ type: "setup", url: platform.devDocsUrl, envVar: platform.envVar })
    }
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
              {/* Platform icon */}
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
                  {/* Manual handle input */}
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

                  {/* OAuth divider */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] text-slate-300 uppercase tracking-wide">or</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* OAuth connect button */}
                  <button
                    type="button"
                    onClick={() => handleOAuthConnect(platform)}
                    className={`w-full h-6 rounded text-[10px] font-medium transition-all ${platform.oauthColor}`}
                  >
                    Login with {platform.name.split(" ")[0]}
                  </button>

                  {/* OAuth feedback message */}
                  {oauthMessage && (
                    oauthMessage.type === "setup" ? (
                      <p className="text-[9px] text-amber-600 leading-snug px-0.5">
                        OAuth setup required — add{" "}
                        <code className="bg-amber-50 rounded px-0.5">
                          {oauthMessage.envVar}_CLIENT_ID
                        </code>{" "}
                        to env vars.{" "}
                        <a
                          href={oauthMessage.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-amber-700"
                        >
                          Dev docs ↗
                        </a>
                      </p>
                    ) : (
                      <p className="text-[9px] text-red-500 leading-snug px-0.5">
                        {oauthMessage.message}
                      </p>
                    )
                  )}
                </div>
              ) : connected ? (
                <div className="w-full space-y-0.5 text-center">
                  <p className="text-[11px] font-semibold text-green-600">✓ Connected</p>
                  <a
                    href={buildProfileUrl(platform.id, connected)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline truncate px-1 block transition-colors"
                  >
                    {connected}
                  </a>
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
