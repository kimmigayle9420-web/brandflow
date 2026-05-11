import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page Not Found — BrandFlow",
}

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-6"
      style={{ backgroundColor: "#FAFAF5" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
        style={{ backgroundColor: "#FEE8E4" }}
      >
        🔍
      </div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#2D1810" }}>
        Page not found
      </h1>
      <p className="text-base mb-8 max-w-sm" style={{ color: "#8A7060" }}>
        That page doesn&apos;t exist or may have moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#F97066" }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
