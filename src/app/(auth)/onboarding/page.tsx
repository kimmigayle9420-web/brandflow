"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Instagram, Sparkles, Loader2, AtSign, Check } from "lucide-react"

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

const STYLE_OPTIONS = [
  "Fine line",
  "Bold",
  "Blackwork",
  "Watercolour",
  "Neo-trad",
  "Traditional",
  "Realism",
  "Illustrative",
  "Geometric",
  "Lettering",
]

const LOCATION_OPTIONS = [
  "Urban",
  "Coastal",
  "Small-town",
  "Studio-based",
  "Travel / Guest",
  "Global",
]

const VOICE_OPTIONS = [
  "Warm",
  "Cheeky",
  "Stoic",
  "Educational",
  "Playful",
  "Direct",
  "Soft",
  "Confident",
]

type Path = "instagram" | "manual" | null

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        backgroundColor: selected ? PALETTE.brick : "white",
        color: selected ? "white" : PALETTE.graphite,
        border: `1px solid ${selected ? PALETTE.brick : PALETTE.border}`,
      }}
    >
      {label}
    </button>
  )
}

function Badge({ kind, label }: { kind: "recommended" | "manual"; label: string }) {
  const isRec = kind === "recommended"
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
      style={{
        backgroundColor: isRec ? PALETTE.greenSoft : "#F5F0EA",
        color: isRec ? PALETTE.green : PALETTE.muted,
        border: `1px solid ${isRec ? "#BBF7D0" : PALETTE.border}`,
      }}
    >
      {label}
    </span>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [path, setPath] = useState<Path>(null)
  const [handle, setHandle] = useState("")
  const [style, setStyle] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [voice, setVoice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const manualReady = style !== null && voice !== null

  const finish = async (brandData: {
    name: string
    niche: string
    target_audience: string | null
    tone_of_voice: string | null
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast({ title: "Not signed in", variant: "destructive" })
      router.push("/login")
      return
    }

    const { error } = await supabase.from("brands").insert({
      user_id: user.id,
      name: brandData.name,
      niche: brandData.niche,
      target_audience: brandData.target_audience,
      tone_of_voice: brandData.tone_of_voice,
      primary_color: "#F97066",
      secondary_color: "#E8956D",
    })

    if (error) {
      toast({
        title: "Couldn't save your brand",
        description: error.message,
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    router.refresh()
    router.push("/onboarding/connect")
  }

  const handleInstagramSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = handle.trim().replace(/^@/, "")
    if (!cleaned) return
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("social_accounts")
        .eq("id", user.id)
        .single()
      const existing = profileRow?.social_accounts ?? {}
      await supabase
        .from("profiles")
        .update({ social_accounts: { ...existing, instagram: cleaned } })
        .eq("id", user.id)
    }

    await finish({
      name: `@${cleaned}`,
      niche: "Content creator",
      target_audience: "To be detected from your last 200 posts.",
      tone_of_voice: null,
    })
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualReady) return
    setSubmitting(true)

    const targetAudience = location
      ? `${location} audience interested in ${style?.toLowerCase()} tattoos.`
      : `Audience interested in ${style?.toLowerCase()} tattoos.`

    await finish({
      name: "My Brand",
      niche: style!,
      target_audience: targetAudience,
      tone_of_voice: voice,
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span
          className="text-[11px] font-semibold tracking-wider"
          style={{ color: PALETTE.muted }}
        >
          STEP 1 OF 2
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-8 rounded-full"
            style={{ backgroundColor: PALETTE.brick }}
          />
          <span
            className="h-1.5 w-8 rounded-full"
            style={{ backgroundColor: PALETTE.border }}
          />
        </div>
      </div>

      <h1
        className="text-[28px] md:text-[32px] leading-tight font-bold text-center mb-2"
        style={{ color: PALETTE.graphite }}
      >
        How should we start knowing your work?
      </h1>
      <p className="text-sm text-center mb-8" style={{ color: PALETTE.muted }}>
        Pick one. You can change everything later.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Instagram card */}
        <button
          type="button"
          onClick={() => setPath("instagram")}
          className="text-left rounded-3xl p-6 transition-all hover:shadow-lg"
          style={{
            backgroundColor: "white",
            border: `2px solid ${path === "instagram" ? PALETTE.brick : PALETTE.border}`,
            boxShadow:
              path === "instagram" ? `0 0 0 4px ${PALETTE.brickSoft}` : undefined,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: PALETTE.brickSoft }}
            >
              <Instagram
                className="h-6 w-6"
                style={{ color: PALETTE.brick }}
                strokeWidth={2.2}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Badge kind="recommended" label="RECOMMENDED" />
              <span
                className="text-[10px] font-semibold tracking-wider"
                style={{ color: PALETTE.muted }}
              >
                30 SEC
              </span>
            </div>
          </div>
          <h2
            className="text-xl font-bold mb-1.5"
            style={{ color: PALETTE.graphite }}
          >
            Analyse my Instagram
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: PALETTE.muted }}>
            Paste your handle. We scan your last 200 posts and detect style,
            audience, and tone for you.
          </p>
        </button>

        {/* Manual card */}
        <button
          type="button"
          onClick={() => setPath("manual")}
          className="text-left rounded-3xl p-6 transition-all hover:shadow-lg"
          style={{
            backgroundColor: "white",
            border: `2px solid ${path === "manual" ? PALETTE.brick : PALETTE.border}`,
            boxShadow:
              path === "manual" ? `0 0 0 4px ${PALETTE.brickSoft}` : undefined,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#F5F0EA" }}
            >
              <Sparkles
                className="h-6 w-6"
                style={{ color: PALETTE.graphite }}
                strokeWidth={2.2}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Badge kind="manual" label="MANUAL" />
              <span
                className="text-[10px] font-semibold tracking-wider"
                style={{ color: PALETTE.muted }}
              >
                2 MIN
              </span>
            </div>
          </div>
          <h2
            className="text-xl font-bold mb-1.5"
            style={{ color: PALETTE.graphite }}
          >
            Pick a niche manually
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: PALETTE.muted }}>
            Tap chips to set your style, location vibe, and how you sound. Done in
            two minutes.
          </p>
        </button>
      </div>

      {/* Expanded form */}
      {path === "instagram" && (
        <form
          onSubmit={handleInstagramSubmit}
          className="mt-6 rounded-3xl p-6"
          style={{
            backgroundColor: "white",
            border: `1px solid ${PALETTE.border}`,
          }}
        >
          <label
            className="text-xs font-semibold tracking-wider block mb-2"
            style={{ color: PALETTE.muted }}
          >
            INSTAGRAM HANDLE
          </label>
          <div className="relative mb-4">
            <AtSign
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: PALETTE.muted }}
            />
            <Input
              type="text"
              placeholder="yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="off"
              autoFocus
              required
              className="h-12 rounded-2xl pl-10 pr-4 text-[15px] bg-white"
              style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !handle.trim()}
            className="w-full h-12 rounded-2xl font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: PALETTE.brick, color: "white" }}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Scan my posts
                <span className="ml-1.5 opacity-70">→</span>
              </>
            )}
          </Button>
          <p
            className="text-[11px] text-center mt-3"
            style={{ color: PALETTE.muted }}
          >
            Only public posts. We never post on your behalf.
          </p>
        </form>
      )}

      {path === "manual" && (
        <form
          onSubmit={handleManualSubmit}
          className="mt-6 rounded-3xl p-6 space-y-6"
          style={{
            backgroundColor: "white",
            border: `1px solid ${PALETTE.border}`,
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label
                className="text-xs font-semibold tracking-wider"
                style={{ color: PALETTE.muted }}
              >
                YOUR STYLE
              </label>
              {style && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: PALETTE.green }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={style === opt}
                  onClick={() => setStyle(opt)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <label
                className="text-xs font-semibold tracking-wider"
                style={{ color: PALETTE.muted }}
              >
                LOCATION VIBE
              </label>
              {location && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: PALETTE.green }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={location === opt}
                  onClick={() => setLocation(opt)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <label
                className="text-xs font-semibold tracking-wider"
                style={{ color: PALETTE.muted }}
              >
                HOW YOU SOUND
              </label>
              {voice && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: PALETTE.green }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {VOICE_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={voice === opt}
                  onClick={() => setVoice(opt)}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || !manualReady}
            className="w-full h-12 rounded-2xl font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: PALETTE.brick, color: "white" }}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Continue
                <span className="ml-1.5 opacity-70">→</span>
              </>
            )}
          </Button>
        </form>
      )}

      {/* Skip link */}
      <div className="text-center mt-6">
        <button
          type="button"
          onClick={() => router.push("/onboarding/connect")}
          className="text-sm font-medium hover:opacity-70"
          style={{ color: PALETTE.muted }}
        >
          Skip for now →
        </button>
      </div>
    </div>
  )
}
