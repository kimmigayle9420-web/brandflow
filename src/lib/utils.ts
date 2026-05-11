import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "other", label: "Other" },
] as const

export const STATUSES = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  { value: "published", label: "Published", color: "bg-green-100 text-green-700" },
  { value: "archived", label: "Archived", color: "bg-orange-100 text-orange-700" },
] as const

export const FORMAT_OPTIONS = [
  { value: "static", label: "Static Post", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  { value: "carousel", label: "Carousel", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { value: "reel", label: "Reel", color: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
  { value: "story", label: "Story", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
] as const

export const TONES = [
  "Professional & Authoritative",
  "Friendly & Conversational",
  "Inspirational & Motivational",
  "Playful & Humorous",
  "Educational & Informative",
  "Empathetic & Supportive",
  "Bold & Direct",
  "Luxury & Exclusive",
  "Casual & Relatable",
  "Creative & Artistic",
]
