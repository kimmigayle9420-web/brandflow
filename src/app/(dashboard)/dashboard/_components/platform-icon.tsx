import type { PlatformId } from "@/data/dashboard"

type Props = {
  id: PlatformId
  size?: number
  className?: string
}

export function PlatformIcon({ id, size = 16, className }: Props) {
  const s = { width: size, height: size }

  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} style={s} aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (id === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={s} aria-hidden>
        <path d="M19 8.5a6.6 6.6 0 0 1-3.86-1.24v7.04a5.7 5.7 0 1 1-5.7-5.7c.34 0 .67.03.99.09v2.95a2.79 2.79 0 1 0 1.95 2.66V3h2.9a4.31 4.31 0 0 0 3.72 4.32V8.5Z" />
      </svg>
    )
  }

  // shorts
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={s} aria-hidden>
      <path d="M16.78 6.27a3.43 3.43 0 0 0-1.78-1.78c-1.05-.5-2.4-.5-2.4-.5l-2.6 4.5h2.6L9.7 14.6h3l-3 6.9 7-9.5h-3l3.08-5.73Z" />
    </svg>
  )
}
