"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const PALETTE = {
  brick: "#F97066",
  graphite: "#2D1810",
  muted: "#8A7060",
  border: "#E5DDD5",
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const supabase = createClient()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" })
      setLoading(false)
      return
    }

    router.refresh()
    router.push(returnTo ?? "/dashboard")
  }

  return (
    <div
      className="max-w-md mx-auto rounded-3xl p-8"
      style={{ backgroundColor: "white", border: `1px solid ${PALETTE.border}` }}
    >
      <h1
        className="text-[26px] leading-tight font-bold text-center mb-2"
        style={{ color: PALETTE.graphite }}
      >
        Welcome back
      </h1>
      <p className="text-sm text-center mb-7" style={{ color: PALETTE.muted }}>
        Sign in to your BrandFlow account
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-xs font-semibold tracking-wider block"
            style={{ color: PALETTE.muted }}
          >
            EMAIL
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-12 rounded-2xl px-4 text-[15px] bg-white"
            style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xs font-semibold tracking-wider block"
            style={{ color: PALETTE.muted }}
          >
            PASSWORD
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-12 rounded-2xl px-4 text-[15px] bg-white"
            style={{ borderColor: PALETTE.border, color: PALETTE.graphite }}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: PALETTE.brick, color: "white" }}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <p className="text-xs text-center mt-6" style={{ color: PALETTE.muted }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold hover:underline"
          style={{ color: PALETTE.brick }}
        >
          Sign up free
        </Link>
      </p>
    </div>
  )
}
