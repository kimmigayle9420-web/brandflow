"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Check, Instagram, Mail, Loader2 } from "lucide-react"

const PALETTE = {
  cream: "#FAFAF5",
  brick: "#F97066",
  brickDark: "#D4432A",
  brickSoft: "#FEF3F2",
  graphite: "#2D1810",
  muted: "#8A7060",
  border: "#E5DDD5",
}

type Step = { id: string; label: string }
const STEPS: Step[] = [
  { id: "account", label: "ACCOUNT" },
  { id: "niche", label: "NICHE" },
  { id: "ready", label: "READY" },
]

function StepIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const isActive = i === activeIndex
        const isDone = i < activeIndex
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor: isActive || isDone ? PALETTE.brick : "transparent",
                  color: isActive || isDone ? "white" : PALETTE.muted,
                  border: isActive || isDone ? "none" : `1.5px solid ${PALETTE.border}`,
                }}
              >
                {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-[11px] font-semibold tracking-wider"
                style={{
                  color: isActive ? PALETTE.graphite : isDone ? PALETTE.brick : PALETTE.muted,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px w-6"
                style={{ backgroundColor: isDone ? PALETTE.brick : PALETTE.border }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProviderIcon({ kind }: { kind: "google" | "apple" }) {
  if (kind === "google") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1A6.99 6.99 0 0 1 5.46 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"instagram" | "google" | "apple" | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "")
  const redirectTo = `${siteUrl}/api/auth/callback?next=/onboarding`

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setEmailLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    setEmailLoading(false)

    if (error) {
      toast({ title: "Couldn't send link", description: error.message, variant: "destructive" })
      return
    }

    setSent(true)
  }

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) {
      toast({
        title: `${provider === "google" ? "Google" : "Apple"} sign-in unavailable`,
        description: error.message,
        variant: "destructive",
      })
      setOauthLoading(null)
    }
  }

  const handleInstagram = async () => {
    setOauthLoading("instagram")
    try {
      const res = await fetch("/api/auth/instagram/initiate?signup=1")
      const data = await res.json()
      if (data.setup) {
        toast({
          title: "Instagram sign-up not configured",
          description: "Use email to continue — you can connect Instagram later.",
        })
        setOauthLoading(null)
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      throw new Error("No auth URL returned")
    } catch (err) {
      toast({
        title: "Instagram sign-up failed",
        description: err instanceof Error ? err.message : "Try email instead.",
        variant: "destructive",
      })
      setOauthLoading(null)
    }
  }

  if (sent) {
    return (
      <div
        className="max-w-md mx-auto rounded-3xl p-8 text-center"
        style={{ backgroundColor: "white", border: `1px solid ${PALETTE.border}` }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: PALETTE.brickSoft }}
        >
          <Mail className="h-6 w-6" style={{ color: PALETTE.brick }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: PALETTE.graphite }}>
          Check your inbox
        </h2>
        <p className="text-sm mb-1" style={{ color: PALETTE.muted }}>
          We sent a magic link to
        </p>
        <p className="text-sm font-semibold mb-6" style={{ color: PALETTE.graphite }}>
          {email}
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-sm font-medium hover:opacity-70"
          style={{ color: PALETTE.brick }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div
      className="max-w-md mx-auto rounded-3xl p-8"
      style={{ backgroundColor: "white", border: `1px solid ${PALETTE.border}` }}
    >
      <StepIndicator activeIndex={0} />

      <h1
        className="text-[26px] leading-tight font-bold text-center mb-2"
        style={{ color: PALETTE.graphite }}
      >
        Make an account.<br />Two minutes. No card.
      </h1>
      <p className="text-sm text-center mb-7" style={{ color: PALETTE.muted }}>
        Pick how you want to start.
      </p>

      <div className="space-y-3">
        <Button
          type="button"
          onClick={handleInstagram}
          disabled={oauthLoading !== null}
          className="w-full h-12 rounded-2xl font-semibold text-[15px] hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PALETTE.brick, color: "white" }}
        >
          {oauthLoading === "instagram" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Instagram className="h-5 w-5 mr-2" strokeWidth={2.2} />
              Continue with Instagram
            </>
          )}
        </Button>
        <p className="text-[11px] text-center -mt-1" style={{ color: PALETTE.muted }}>
          Imports your handle and last 200 posts
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuth("google")}
            disabled={oauthLoading !== null}
            className="h-11 rounded-2xl font-medium text-sm bg-white hover:bg-[#FAFAF5]"
            style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
          >
            {oauthLoading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ProviderIcon kind="google" />
                <span className="ml-2">Google</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuth("apple")}
            disabled={oauthLoading !== null}
            className="h-11 rounded-2xl font-medium text-sm bg-white hover:bg-[#FAFAF5]"
            style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
          >
            {oauthLoading === "apple" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ProviderIcon kind="apple" />
                <span className="ml-2">Apple</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: PALETTE.border }} />
        <span
          className="text-[10px] font-semibold tracking-[0.15em]"
          style={{ color: PALETTE.muted }}
        >
          OR USE EMAIL
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: PALETTE.border }} />
      </div>

      <form onSubmit={handleEmailContinue} className="space-y-3">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-12 rounded-2xl px-4 text-[15px] bg-white focus-visible:ring-2"
          style={{
            borderColor: PALETTE.border,
            color: PALETTE.graphite,
          }}
        />
        <Button
          type="submit"
          disabled={emailLoading || oauthLoading !== null || !email.trim()}
          className="w-full h-12 rounded-2xl font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: PALETTE.graphite, color: "white" }}
        >
          {emailLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
        </Button>
      </form>

      <p className="text-xs text-center mt-6" style={{ color: PALETTE.muted }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: PALETTE.brick }}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
