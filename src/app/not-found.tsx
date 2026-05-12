import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page Not Found — BrandFlow",
}

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-6"
      style={{ backgroundColor: "#EDE6DC" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
        style={{ backgroundColor: "#EDE6DC" }}
      >
        🔍
      </div>
      <h1 className="text-3xl font-semibold mb-2" style={{ color: "#2D2D2D" }}>
        Page not found
      </h1>
      <p className="text-base mb-8 max-w-sm" style={{ color: "#8B7261" }}>
        That page doesn&apos;t exist or may have moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#E06A33" }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
