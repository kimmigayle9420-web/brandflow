"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Instagram, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

const PALETTE = {
  cream: "#FAFAF5",
  brick: "#F97066",
  brickDark: "#D4432A",
  brickSoft: "#FEF3F2",
  graphite: "#2D1810",
  muted: "#8A7060",
  border: "#E5DDD5",
  green: "#16A34A",
  greenSoft: "#F0FDF4",
}

type PlatformDef = {
  id: string
  name: string
  emoji: string
  gradient: string
  placeholder: string
  hasOAuth: boolean
}

const PLATFORMS: PlatformDef[] = [
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📸",
    gradient: "linear-gradient(135deg, #f97316, #ec4899)",
    placeholder: "@yourhandle",
    hasOAuth: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    emoji: "🎵",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    placeholder: "@yourhandle",
    hasOAuth: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    emoji: "▶️",
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    placeholder: "@channel",
    hasOAuth: false,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    emoji: "📌",
    gradient: "linear-gradient(135deg, #f43f5e, #e11d48)",
    placeholder: "@yourhandle",
    hasOAuth: false,
  },
]

export default function ConnectAccountsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [connected, setConnected] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState("")
  const [saving, setSaving] = useState(false)
  const [igLoading, setIgLoading] = useState(false)

  const handleInstagramOAuth = async () => {
    setIgLoading(true)
    try {
      const res = await fetch("/api/auth/instagram/initiate")
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setIgLoading(false)
    }
  }

  const handleSaveHandle = async (platformId: string) => {
    const trimmed = inputVal.trim().replace(/^@/, "")
    if (!trimmed) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("social_accounts")
          .eq("id", user.id)
          .single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = (profileRow as any)?.social_accounts ?? {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("profiles")
          .update({ social_accounts: { ...existing, [platformId]: trimmed } })
          .eq("id", user.id)
      }
      setConnected((prev) => ({ ...prev, [platformId]: trimmed }))
      setExpandedId(null)
      setInputVal("")
    } finally {
      setSaving(false)
    }
  }

  const anyConnected = Object.keys(connected).length > 0

  return (
    <div className="max-w-xl mx-auto">
      {/* Step header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-[11px] font-semibold tracking-wider" style={{ color: PALETTE.muted }}>
          STEP 2 OF 2
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: PALETTE.brick }} />
          <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: PALETTE.brick }} />
        </div>
      </div>

      <h1
        className="text-[28px] md:text-[32px] leading-tight font-bold text-center mb-2"
        style={{ color: PALETTE.graphite }}
      >
        Connect your accounts
      </h1>
      <p className="text-sm text-center mb-8" style={{ color: PALETTE.muted }}>
        Link your platforms so BrandFlow can track your stats and schedule content.
      </p>

      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const isConnected = !!connected[platform.id]
          const isExpanded = expandedId === platform.id

          return (
            <div
              key={platform.id}
              className="rounded-3xl p-5 transition-all"
              style={{
                backgroundColor: "white",
                border: `1.5px solid ${isConnected ? PALETTE.brick : PALETTE.border}`,
                boxShadow: isConnected ? `0 0 0 3px ${PALETTE.brickSoft}` : undefined,
              }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl shrink-0"
                  style={{ background: platform.gradient }}
                >
                  {platform.emoji}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: PALETTE.graphite }}>
                    {platform.name}
                  </p>
                  {isConnected ? (
                    <p className="text-xs mt-0.5" style={{ color: PALETTE.green }}>
                      @{connected[platform.id]} connected
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: PALETTE.muted }}>
                      Not connected
                    </p>
                  )}
                </div>

                {/* Action */}
                {isConnected ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: PALETTE.green }} />
                ) : platform.hasOAuth ? (
                  <Button
                    size="sm"
                    onClick={handleInstagramOAuth}
                    disabled={igLoading}
                    className="rounded-full font-semibold hover:opacity-90 transition-opacity shrink-0"
                    style={{ backgroundColor: PALETTE.brick, color: "white" }}
                  >
                    {igLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Instagram className="h-3.5 w-3.5 mr-1.5" />
                        Connect
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : platform.id)
                      setInputVal("")
                    }}
                    className="rounded-full shrink-0"
                    style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
                  >
                    {isExpanded ? "Cancel" : "Add handle"}
                  </Button>
                )}
              </div>

              {/* Manual handle input */}
              {isExpanded && !platform.hasOAuth && (
                <div className="mt-4 flex gap-2">
                  <Input
                    autoFocus
                    placeholder={platform.placeholder}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !saving) handleSaveHandle(platform.id)
                      if (e.key === "Escape") { setExpandedId(null); setInputVal("") }
                    }}
                    className="h-10 rounded-xl text-sm"
                    style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
                  />
                  <Button
                    disabled={saving || !inputVal.trim()}
                    onClick={() => handleSaveHandle(platform.id)}
                    className="h-10 px-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: PALETTE.brick, color: "white" }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="mt-8 space-y-3">
        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full h-12 rounded-2xl font-semibold text-[15px] hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PALETTE.brick, color: "white" }}
        >
          {anyConnected ? (
            <>
              Go to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Continue to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        {!anyConnected && (
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: PALETTE.muted }}
          >
            Skip for now →
          </button>
        )}
      </div>
    </div>
  )
}
