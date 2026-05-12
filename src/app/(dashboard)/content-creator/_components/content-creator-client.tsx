"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Sparkles, Loader2, Plus, X, Upload, FileText, Film,
  LayoutGrid, Image as ImageIcon, Save, Trash2, Wand2, Instagram,
  Music2, Youtube, Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  ChevronLeft, ChevronRight, Hash, Calendar, Play, Volume2,
  Eye, ImageOff, Download,
} from "lucide-react"
import type { Brand, ContentPillar, Idea } from "@/types"

// ─── Types & meta ───────────────────────────────────────────────────────────

type PlatformKey = "ig_post" | "ig_reel" | "ig_story" | "tiktok" | "yt_short"
type DbFormat = "post" | "carousel" | "reel"
type MediaItem = { url: string; name: string; type: "image" | "video"; isBlob: boolean }

type PlatformMeta = {
  key: PlatformKey
  label: string
  short: string
  aspect: string
  captionMax: number
  hashtagMax: number
  dbFormat: DbFormat
  accent: string
  gradient: string
  icon: React.ReactNode
}

const PLATFORMS: PlatformMeta[] = [
  {
    key: "ig_post",
    label: "Instagram Post",
    short: "IG Post",
    aspect: "4 / 5",
    captionMax: 2200,
    hashtagMax: 30,
    dbFormat: "post",
    accent: "#E1306C",
    gradient: "linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)",
    icon: <Instagram className="h-4 w-4" />,
  },
  {
    key: "ig_reel",
    label: "Instagram Reel",
    short: "IG Reel",
    aspect: "9 / 16",
    captionMax: 2200,
    hashtagMax: 30,
    dbFormat: "reel",
    accent: "#E1306C",
    gradient: "linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)",
    icon: <Film className="h-4 w-4" />,
  },
  {
    key: "ig_story",
    label: "Instagram Story",
    short: "IG Story",
    aspect: "9 / 16",
    captionMax: 0,
    hashtagMax: 10,
    dbFormat: "post",
    accent: "#E1306C",
    gradient: "linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: "tiktok",
    label: "TikTok",
    short: "TikTok",
    aspect: "9 / 16",
    captionMax: 2200,
    hashtagMax: 30,
    dbFormat: "reel",
    accent: "#000000",
    gradient: "linear-gradient(135deg,#25F4EE 0%,#000 50%,#FE2C55 100%)",
    icon: <Music2 className="h-4 w-4" />,
  },
  {
    key: "yt_short",
    label: "YouTube Short",
    short: "YT Short",
    aspect: "9 / 16",
    captionMax: 5000,
    hashtagMax: 15,
    dbFormat: "reel",
    accent: "#FF0000",
    gradient: "linear-gradient(135deg,#FF0000 0%,#CC0000 100%)",
    icon: <Youtube className="h-4 w-4" />,
  },
]

const platformMeta = (key: PlatformKey): PlatformMeta =>
  PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[0]

const FORMAT_BADGE: Record<DbFormat, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  post: { label: "Post", bg: "#F0FDF4", text: "#16A34A", icon: <FileText className="h-3 w-3" /> },
  carousel: { label: "Carousel", bg: "#EEF2FF", text: "#5B6AC4", icon: <LayoutGrid className="h-3 w-3" /> },
  reel: { label: "Reel", bg: "#FEF0EA", text: "#D4432A", icon: <Film className="h-3 w-3" /> },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

function looksLikeVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v|ogv)(\?|$)/i.test(url)
}

function pickMediaType(url: string, mime?: string): "image" | "video" {
  if (mime) return mime.startsWith("video/") ? "video" : "image"
  return looksLikeVideoUrl(url) ? "video" : "image"
}

function platformFromIdea(idea: Idea): PlatformKey {
  const stored = (idea.script as { platform?: string } | null)?.platform
  if (stored && PLATFORMS.some((p) => p.key === stored)) return stored as PlatformKey
  // Fallback by format
  if (idea.format === "reel") return "ig_reel"
  if (idea.format === "carousel") return "ig_post"
  return "ig_post"
}

// ─── Editor state ───────────────────────────────────────────────────────────

type EditorState = {
  ideaId: string | null
  platform: PlatformKey
  pillarId: string | null
  media: MediaItem[]
  mediaIndex: number
  hook: string
  caption: string
  hashtags: string[]
}

const EMPTY_EDITOR: EditorState = {
  ideaId: null,
  platform: "ig_post",
  pillarId: null,
  media: [],
  mediaIndex: 0,
  hook: "",
  caption: "",
  hashtags: [],
}

function editorFromIdea(idea: Idea): EditorState {
  const platform = platformFromIdea(idea)
  const tags = idea.hashtags
    ? idea.hashtags.split(/\s+/).filter(Boolean).map((t) => t.replace(/^#/, ""))
    : []
  const media: MediaItem[] = idea.media_url
    ? [{
        url: idea.media_url,
        name: idea.media_url.split("/").pop()?.split("?")[0] ?? "media",
        type: pickMediaType(idea.media_url),
        isBlob: idea.media_url.startsWith("blob:"),
      }]
    : []
  return {
    ideaId: idea.id,
    platform,
    pillarId: idea.pillar_id,
    media,
    mediaIndex: 0,
    hook: idea.hook ?? "",
    caption: idea.caption ?? "",
    hashtags: tags,
  }
}

// ─── Media slot ─────────────────────────────────────────────────────────────

function MediaSlot({ item, className }: { item: MediaItem | null; className?: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    if (!item) return
    if (item.url.startsWith("blob:") || item.url.startsWith("data:")) {
      setStatus("ready")
    } else {
      setStatus("loading")
    }
  }, [item])

  if (!item) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ color: "rgba(255,255,255,0.45)" }}>
        <ImageIcon className="h-8 w-8" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1", className)} style={{ color: "rgba(255,255,255,0.6)" }}>
        <ImageOff className="h-7 w-7" />
        <span className="text-[10px]">Couldn&apos;t load</span>
      </div>
    )
  }

  if (item.type === "video") {
    return (
      <video
        src={item.url}
        className={cn("w-full h-full object-cover", className)}
        controls
        playsInline
        onLoadedData={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.name}
      className={cn("w-full h-full object-cover", className)}
      style={{ visibility: status === "loading" ? "hidden" : "visible" }}
      onLoad={() => setStatus("ready")}
      onError={() => setStatus("error")}
    />
  )
}

// ─── Phone preview frame ────────────────────────────────────────────────────

function PhoneFrame({ aspect, children }: { aspect: string; children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto rounded-[36px] p-3 shadow-2xl"
      style={{
        background: "linear-gradient(180deg,#1f1614 0%,#0a0605 100%)",
        width: "min(360px, 100%)",
        boxShadow: "0 30px 60px -20px rgba(45,24,16,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      {/* speaker notch */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 h-5 w-24 rounded-full z-20"
        style={{ background: "#0a0605" }}
      />
      <div
        className="relative overflow-hidden rounded-[28px] bg-black"
        style={{ aspectRatio: aspect }}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Platform-specific previews ─────────────────────────────────────────────

function IGFeedPreview({
  state,
  handle,
}: {
  state: EditorState
  handle: string
}) {
  const current = state.media[state.mediaIndex] ?? null
  const tags = state.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")
  const captionText = [state.hook, state.caption].filter(Boolean).join(state.hook ? "\n\n" : "")

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* status bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[10px] font-semibold text-black">
        <span>9:41</span>
        <span>● ● ●</span>
      </div>
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "#EFEFEF" }}>
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-full"
            style={{ background: "linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)", padding: 2 }}
          >
            <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-black">
              {handle.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[12px] font-semibold text-black">{handle}</span>
            <span className="text-[10px] text-gray-500">Sponsored</span>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-black" />
      </div>
      {/* media */}
      <div className="relative bg-[#FAFAFA] w-full" style={{ aspectRatio: "4 / 5" }}>
        <MediaSlot item={current} className="w-full h-full" />
        {state.media.length > 1 && (
          <>
            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              {state.mediaIndex + 1}/{state.media.length}
            </div>
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
              {state.media.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: i === state.mediaIndex ? "#0095F6" : "rgba(255,255,255,0.7)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* action row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4 text-black">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
        <Bookmark className="h-5 w-5 text-black" />
      </div>
      {/* caption */}
      <div className="px-3 pb-3 flex-1 overflow-hidden">
        <p className="text-[11px] font-semibold text-black mb-0.5">1,284 likes</p>
        {captionText ? (
          <p className="text-[11px] text-black leading-snug line-clamp-3">
            <span className="font-semibold mr-1">{handle}</span>
            {captionText}
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 italic">Your caption will appear here…</p>
        )}
        {tags && (
          <p className="text-[11px] text-blue-700 mt-1 line-clamp-2">{tags}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">View all 38 comments</p>
        <p className="text-[10px] text-gray-400 mt-0.5">2 minutes ago</p>
      </div>
    </div>
  )
}

function VerticalPreview({
  state,
  handle,
  variant,
}: {
  state: EditorState
  handle: string
  variant: "ig_reel" | "tiktok" | "yt_short"
}) {
  const current = state.media[state.mediaIndex] ?? null
  const tags = state.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")
  const captionText = [state.hook, state.caption].filter(Boolean).join(state.hook ? "\n\n" : "")
  const isYT = variant === "yt_short"

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* media background */}
      <div className="absolute inset-0">
        {current ? (
          <MediaSlot item={current} className="w-full h-full" />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: platformMeta(variant).gradient }}
          >
            <Play className="h-10 w-10 text-white/80" />
            <span className="text-white/80 text-xs font-medium">Drop media to preview</span>
          </div>
        )}
      </div>

      {/* dark gradient overlays for legibility */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-44 pointer-events-none"
        style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)" }}
      />

      {/* top bar */}
      <div className="absolute top-2 left-0 right-0 px-3 flex items-center justify-between text-white z-10">
        <span className="text-[10px] font-semibold">9:41</span>
        <span className="text-[12px] font-bold">
          {variant === "ig_reel" ? "Reels" : variant === "tiktok" ? "For You" : "Shorts"}
        </span>
        <span className="text-[10px]">● ● ●</span>
      </div>

      {/* right-side actions */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 z-10 text-white">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Heart className="h-5 w-5" fill="white" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">12.4k</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">238</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Share</span>
        </div>
        {!isYT && (
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Bookmark className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      {/* bottom caption */}
      <div className="absolute bottom-0 left-0 right-14 p-3 z-10 text-white">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="h-7 w-7 rounded-full"
            style={{ background: "linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)", padding: 2 }}
          >
            <div className="h-full w-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white">
              {handle.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <span className="text-[12px] font-semibold">@{handle.replace(/^@/, "")}</span>
          <span className="px-2 py-0.5 rounded border border-white/70 text-[10px] font-semibold">Follow</span>
        </div>
        {captionText ? (
          <p className="text-[11px] leading-snug line-clamp-3 whitespace-pre-line drop-shadow">
            {captionText}
          </p>
        ) : (
          <p className="text-[11px] italic opacity-70">Your caption appears here…</p>
        )}
        {tags && <p className="text-[11px] text-white/80 mt-1 line-clamp-1">{tags}</p>}
        <div className="flex items-center gap-1.5 mt-2">
          <Volume2 className="h-3 w-3" />
          <span className="text-[10px] truncate">Original audio · @{handle.replace(/^@/, "")}</span>
        </div>
      </div>
    </div>
  )
}

function IGStoryPreview({
  state,
  handle,
}: {
  state: EditorState
  handle: string
}) {
  const current = state.media[state.mediaIndex] ?? null
  const captionText = [state.hook, state.caption].filter(Boolean).join(" ")

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "linear-gradient(135deg,#F58529 0%,#DD2A7B 50%,#8134AF 100%)" }}>
      {current && <div className="absolute inset-0"><MediaSlot item={current} className="w-full h-full" /></div>}
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)" }}
      />
      {/* progress bars */}
      <div className="absolute top-2 left-2 right-2 flex items-center gap-1 z-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/40 overflow-hidden">
            <div className="h-full bg-white" style={{ width: i === 0 ? "60%" : "0%" }} />
          </div>
        ))}
      </div>
      {/* header */}
      <div className="absolute top-5 left-2 right-2 flex items-center gap-2 z-10 text-white">
        <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">
          {handle.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-[12px] font-semibold">@{handle.replace(/^@/, "")}</span>
        <span className="text-[10px] opacity-70">2m</span>
      </div>
      {/* caption overlay */}
      {captionText && (
        <div className="absolute left-3 right-3 bottom-20 z-10">
          <div className="bg-black/45 backdrop-blur-sm px-3 py-2 rounded-xl">
            <p className="text-[12px] text-white leading-snug whitespace-pre-line line-clamp-4">
              {captionText}
            </p>
          </div>
        </div>
      )}
      {/* reply bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        <div className="rounded-full border border-white/60 px-3 py-2 text-[11px] text-white/80">
          Send message
        </div>
      </div>
    </div>
  )
}

function LivePreview({ state, handle }: { state: EditorState; handle: string }) {
  const meta = platformMeta(state.platform)
  const cleanHandle = handle.replace(/^@/, "") || "yourbrand"

  return (
    <PhoneFrame aspect={meta.aspect}>
      {state.platform === "ig_post" && <IGFeedPreview state={state} handle={cleanHandle} />}
      {state.platform === "ig_reel" && <VerticalPreview state={state} handle={cleanHandle} variant="ig_reel" />}
      {state.platform === "ig_story" && <IGStoryPreview state={state} handle={cleanHandle} />}
      {state.platform === "tiktok" && <VerticalPreview state={state} handle={cleanHandle} variant="tiktok" />}
      {state.platform === "yt_short" && <VerticalPreview state={state} handle={cleanHandle} variant="yt_short" />}
    </PhoneFrame>
  )
}

// ─── Auto-resize textarea ───────────────────────────────────────────────────

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 600)}px`
  }, [props.value])
  return <Textarea ref={ref} {...props} />
}

// ─── Hashtag chips ──────────────────────────────────────────────────────────

function HashtagChips({
  tags,
  max,
  onChange,
}: {
  tags: string[]
  max: number
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#/, "").replace(/\s+/g, "")
    if (!cleaned) return
    const lower = cleaned.toLowerCase()
    if (tags.some((t) => t.toLowerCase() === lower)) return
    if (tags.length >= max) return
    onChange([...tags, cleaned])
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(draft)
      setDraft("")
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
          >
            #{t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className="opacity-50 hover:opacity-100"
              aria-label={`Remove #${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#8A7060" }} />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder={tags.length >= max ? `Max ${max} hashtags` : "Type a hashtag, press Enter"}
            disabled={tags.length >= max}
            className="pl-9 text-sm min-h-[40px]"
            style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
          />
        </div>
        <span className="text-[10px] font-medium" style={{ color: "#8A7060" }}>
          {tags.length}/{max}
        </span>
      </div>
    </div>
  )
}

// ─── Media uploader ─────────────────────────────────────────────────────────

function MediaUploader({
  media,
  onAdd,
  onRemove,
  onSelect,
  onReorder,
  activeIndex,
}: {
  media: MediaItem[]
  onAdd: (items: MediaItem[]) => void
  onRemove: (index: number) => void
  onSelect: (index: number) => void
  onReorder: (from: number, to: number) => void
  activeIndex: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const { toast } = useToast()

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const arr = Array.from(files)
    const next: MediaItem[] = []
    for (const f of arr) {
      if (f.size > 100 * 1024 * 1024) {
        toast({ title: `${f.name} is too large`, description: "Max 100MB per file.", variant: "destructive" })
        continue
      }
      const url = URL.createObjectURL(f)
      next.push({
        url,
        name: f.name,
        type: pickMediaType(f.name, f.type),
        isBlob: true,
      })
    }
    if (next.length) onAdd(next)
  }

  const handleUrlAdd = () => {
    const v = urlInput.trim()
    if (!v) return
    onAdd([{
      url: v,
      name: v.split("/").pop()?.split("?")[0] ?? "media",
      type: pickMediaType(v),
      isBlob: false,
    }])
    setUrlInput("")
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {media.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center px-4 py-10 cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? "#F97066" : "#E5DDD5",
            backgroundColor: dragOver ? "#FEF0EA" : "#FAFAF5",
          }}
        >
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: "#FEF0EA", color: "#D4432A" }}
          >
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold" style={{ color: "#2D1810" }}>
            Drop media or click to upload
          </p>
          <p className="text-xs mt-1" style={{ color: "#8A7060" }}>
            Images or video · JPG, PNG, MP4, MOV · up to 100MB
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {media.map((m, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => setDraggingIdx(i)}
                onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null) }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i) }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggingIdx !== null && draggingIdx !== i) onReorder(draggingIdx, i)
                  setDraggingIdx(null)
                  setDragOverIdx(null)
                }}
                className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group bg-[#1f1614] transition-opacity"
                onClick={() => onSelect(i)}
                style={{
                  outline: i === activeIndex ? "2px solid #F97066" : dragOverIdx === i ? "2px solid #C2B5A3" : "1px solid #E5DDD5",
                  outlineOffset: i === activeIndex || dragOverIdx === i ? "2px" : "0px",
                  opacity: draggingIdx === i ? 0.4 : 1,
                }}
              >
                {m.type === "video" ? (
                  <>
                    <video src={m.url} className="w-full h-full object-cover" muted />
                    <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-white drop-shadow" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
                {m.isBlob && (
                  <span className="absolute bottom-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded bg-yellow-300 text-yellow-900">
                    LOCAL
                  </span>
                )}
                {/* Drag handle hint */}
                <span className="absolute top-1 left-1 text-[9px] font-bold text-white/70 bg-black/40 rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                  ⠿
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:bg-[#FAFAF5]"
              style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}
              aria-label="Add more media"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px] font-medium">Add</span>
            </button>
          </div>
          {media.length > 1 && (
            <p className="text-[11px] font-medium" style={{ color: "#7A5C50" }}>
              {media.length} items · click to preview · drag to reorder
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = "" }}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type="url"
            placeholder="Or paste an image / video URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlAdd() } }}
            className="text-sm min-h-[40px]"
            style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
          />
        </div>
        <Button
          type="button"
          onClick={handleUrlAdd}
          disabled={!urlInput.trim()}
          variant="outline"
          className="min-h-[40px]"
          style={{ borderColor: "#E5DDD5", color: "#5A3825" }}
        >
          Add URL
        </Button>
      </div>
    </div>
  )
}

// ─── Editor workspace ───────────────────────────────────────────────────────

function EditorWorkspace({
  open,
  state,
  setState,
  brand,
  pillars,
  userId,
  onClose,
  onSaved,
  onDeleted,
  handle,
}: {
  open: boolean
  state: EditorState
  setState: React.Dispatch<React.SetStateAction<EditorState>>
  brand: Brand | null
  pillars: ContentPillar[]
  userId: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
  handle: string
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [busy, setBusy] = useState<null | "hook" | "caption" | "hashtags" | "all">(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const meta = platformMeta(state.platform)
  const selectedPillar = pillars.find((p) => p.id === state.pillarId) ?? null
  const captionLen = state.caption.length + (state.hook ? state.hook.length + 2 : 0)
  const captionLimit = meta.captionMax

  // ESC closes
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  const callApi = useCallback(async <T,>(path: string, body: unknown): Promise<T> => {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error ?? "Request failed")
    return data as T
  }, [])

  const generateHook = async () => {
    setBusy("hook")
    try {
      const data = await callApi<{ hooks: string[] }>("/api/generate-hooks", {
        topic: state.caption.slice(0, 200) || state.hook || "scroll-stopping idea",
        brandName: brand?.name,
        niche: brand?.niche,
        tone: brand?.tone_of_voice,
        targetAudience: brand?.target_audience,
        pillarName: selectedPillar?.name,
        pillarDescription: selectedPillar?.description,
        pillarVoiceDirection: selectedPillar?.voice_direction,
        pillarFormatPreference: meta.dbFormat,
      })
      const first = data.hooks?.[0]
      if (first) setState((s) => ({ ...s, hook: first }))
      toast({ title: "Hook generated" })
    } catch (err) {
      toast({ title: "Couldn't generate hook", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const generateCaption = async () => {
    setBusy("caption")
    try {
      const data = await callApi<{ caption: string }>("/api/generate-caption", {
        hook: state.hook || "scroll-stopping content",
        notes: `Platform: ${meta.label}. Format: ${meta.dbFormat}.`,
        brandName: brand?.name,
        niche: brand?.niche,
        tone: brand?.tone_of_voice,
        targetAudience: brand?.target_audience,
        pillarName: selectedPillar?.name,
        pillarDescription: selectedPillar?.description,
        pillarVoiceDirection: selectedPillar?.voice_direction,
        pillarFormatPreference: meta.dbFormat,
      })
      if (data.caption) setState((s) => ({ ...s, caption: data.caption }))
      toast({ title: "Caption written" })
    } catch (err) {
      toast({ title: "Couldn't write caption", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const suggestHashtags = async () => {
    setBusy("hashtags")
    try {
      const data = await callApi<{ niche?: string[]; broad?: string[]; engagement?: string[] }>(
        "/api/generate-hashtags",
        { niche: brand?.niche, caption: state.caption || state.hook, brandName: brand?.name },
      )
      const all = [...(data.niche ?? []), ...(data.broad ?? []), ...(data.engagement ?? [])]
        .map((t) => t.replace(/^#/, ""))
        .filter(Boolean)
      const seen = new Set<string>(state.hashtags.map((t) => t.toLowerCase()))
      const merged = [...state.hashtags]
      for (const t of all) {
        const k = t.toLowerCase()
        if (!seen.has(k) && merged.length < meta.hashtagMax) {
          seen.add(k)
          merged.push(t)
        }
      }
      setState((s) => ({ ...s, hashtags: merged }))
      toast({ title: "Hashtags suggested" })
    } catch (err) {
      toast({ title: "Couldn't suggest hashtags", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const save = async (status: "draft" | "scheduled") => {
    if (!brand) {
      toast({ title: "Set up a brand first", variant: "destructive" })
      return null
    }
    if (!state.hook.trim() && !state.caption.trim()) {
      toast({ title: "Add a hook or caption", description: "Empty drafts can't be saved.", variant: "destructive" })
      return null
    }

    // ideas.format only supports post/carousel/reel — derive from platform + media count
    const dbFormat: DbFormat =
      state.platform === "ig_reel" || state.platform === "tiktok" || state.platform === "yt_short"
        ? "reel"
        : state.media.length > 1
          ? "carousel"
          : "post"

    const firstPersistable = state.media.find((m) => !m.isBlob)
    if (state.media.length > 0 && !firstPersistable) {
      toast({
        title: "Heads up — local media can't be saved",
        description: "Files uploaded from your device only live in this tab. Saving without media URL.",
      })
    }

    const titleSource = state.hook || state.caption.split(/[.\n]/)[0] || "Untitled post"
    const title = titleSource.trim().slice(0, 120)

    const shared = {
      pillar_id: state.pillarId,
      format: dbFormat,
      title,
      hook: state.hook || null,
      caption: state.caption || null,
      hashtags: state.hashtags.length
        ? state.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")
        : null,
      script: {
        platform: state.platform,
        media_count: state.media.length,
      },
      media_url: firstPersistable?.url ?? null,
      // When adding to the calendar, mark today as the scheduled date so the
      // idea shows up on the calendar timeline (the user can drag it later).
      ...(status === "scheduled" && { scheduled_at: new Date().toISOString() }),
      status: status === "draft" ? ("draft" as const) : ("scheduled" as const),
    }

    setSaving(true)
    try {
      const table = supabase.from("ideas")
      const { data, error } = state.ideaId
        ? await table.update(shared).eq("id", state.ideaId).select().single()
        : await table.insert({ user_id: userId, brand_id: brand.id, ...shared }).select().single()
      if (error) throw error
      toast({
        title: status === "draft" ? "Saved as draft" : "Added to calendar",
        description: "Open the calendar to schedule a date and time.",
      })
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      toast({ title: "Couldn't save", description: msg, variant: "destructive" })
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    const saved = await save("draft")
    if (saved) { onSaved(); onClose() }
  }

  const handleAddToCalendar = async () => {
    const saved = await save("scheduled")
    if (saved) { onSaved(); onClose() }
  }

  const handleDelete = async () => {
    if (!state.ideaId) return
    setDeleting(true)
    const { error } = await supabase.from("ideas").delete().eq("id", state.ideaId)
    setDeleting(false)
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Deleted" })
    onDeleted()
    onClose()
  }

  const handleDownload = () => {
    const item = state.media[state.mediaIndex] ?? state.media[0]
    if (!item) {
      toast({ title: "No media to download", variant: "destructive" })
      return
    }
    if (item.isBlob) {
      // Local file — trigger browser download
      const a = document.createElement("a")
      a.href = item.url
      a.download = item.name
      a.click()
    } else {
      // Remote URL — open in new tab so user can save it
      window.open(item.url, "_blank", "noopener,noreferrer")
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#EDE6DC" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3 border-b"
        style={{ borderColor: "#D9CFC2", backgroundColor: "#FAFAF5" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-[#EDE6DC]"
            aria-label="Close editor"
          >
            <X className="h-5 w-5" style={{ color: "#5A3825" }} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#FEF0EA", color: "#D4432A" }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-sm md:text-base font-semibold" style={{ color: "#2D1810" }}>
              {state.ideaId ? "Edit post" : "New post"}
            </h2>
            {selectedPillar && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium"
                style={{ borderColor: "#E5DDD5", backgroundColor: "white", color: "#5A3825" }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedPillar.color }} />
                {selectedPillar.emoji} {selectedPillar.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.ideaId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="hidden sm:inline-flex h-10 w-10 rounded-xl border items-center justify-center transition-colors hover:bg-[#FEE2E2]"
              style={{ borderColor: "#E5DDD5", color: "#DC2626" }}
              aria-label="Delete"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          {state.media.length > 0 && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download current media"
              className="hidden sm:inline-flex h-10 w-10 rounded-xl border items-center justify-center transition-colors hover:bg-[#EDE6DC]"
              style={{ borderColor: "#E5DDD5", color: "#5A3825" }}
              aria-label="Download media"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving}
            className="gap-2 min-h-[40px]"
            style={{ borderColor: "#E5DDD5", color: "#5A3825", backgroundColor: "white" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Save draft</span>
          </Button>
          <Button
            onClick={handleAddToCalendar}
            disabled={saving}
            className="gap-2 min-h-[40px]"
            style={{ backgroundColor: "#F97066", color: "white" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            <span className="hidden sm:inline">Add to calendar</span>
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* LEFT: Editor */}
          <div className="overflow-y-auto px-4 md:px-6 py-5 space-y-5">
            {/* Platform pills */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
                Platform
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const active = state.platform === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setState((s) => ({ ...s, platform: p.key }))}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border min-h-[36px] transition-all"
                      style={
                        active
                          ? { borderColor: p.accent, backgroundColor: p.accent, color: "white" }
                          : { borderColor: "#E5DDD5", backgroundColor: "white", color: "#5A3825" }
                      }
                    >
                      {p.icon}
                      {p.short}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Media */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
                Media
              </label>
              <MediaUploader
                media={state.media}
                onAdd={(items) => setState((s) => ({ ...s, media: [...s.media, ...items], mediaIndex: s.media.length }))}
                onRemove={(i) => setState((s) => {
                  const next = s.media.filter((_, idx) => idx !== i)
                  return {
                    ...s,
                    media: next,
                    mediaIndex: Math.min(s.mediaIndex, Math.max(0, next.length - 1)),
                  }
                })}
                onSelect={(i) => setState((s) => ({ ...s, mediaIndex: i }))}
                onReorder={(from, to) => setState((s) => {
                  const next = [...s.media]
                  const [moved] = next.splice(from, 1)
                  next.splice(to, 0, moved)
                  return { ...s, media: next, mediaIndex: to }
                })}
                activeIndex={state.mediaIndex}
              />
            </div>

            {/* Pillar */}
            {pillars.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#8A7060" }}>
                  Content pillar
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {pillars.map((p) => {
                    const active = state.pillarId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setState((s) => ({ ...s, pillarId: active ? null : p.id }))}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border min-h-[34px] transition-all"
                        style={
                          active
                            ? { borderColor: p.color, backgroundColor: p.color + "1A", color: "#2D1810" }
                            : { borderColor: "#E5DDD5", backgroundColor: "white", color: "#5A3825" }
                        }
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.emoji && <span className="leading-none">{p.emoji}</span>}
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hook */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A7060" }}>
                  Hook · first line
                </label>
                <button
                  type="button"
                  onClick={generateHook}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors hover:bg-[#FEF0EA] disabled:opacity-50"
                  style={{ borderColor: "#F5C4BC", backgroundColor: "#FEF0EA", color: "#D4432A" }}
                >
                  {busy === "hook" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Generate hook
                </button>
              </div>
              <Input
                value={state.hook}
                onChange={(e) => setState((s) => ({ ...s, hook: e.target.value }))}
                placeholder="Stop the scroll in 5 words or less…"
                className="text-sm min-h-[44px] font-medium"
                style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
              />
            </div>

            {/* Caption */}
            {state.platform !== "ig_story" && (
              <div>
                <div className="flex items-end justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A7060" }}>
                    Caption
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{
                      color: captionLen > captionLimit ? "#DC2626" : "#8A7060",
                    }}>
                      {captionLen}/{captionLimit}
                    </span>
                    <button
                      type="button"
                      onClick={generateCaption}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors hover:bg-[#FEF0EA] disabled:opacity-50"
                      style={{ borderColor: "#F5C4BC", backgroundColor: "#FEF0EA", color: "#D4432A" }}
                    >
                      {busy === "caption" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Write caption
                    </button>
                  </div>
                </div>
                <AutoTextarea
                  value={state.caption}
                  onChange={(e) => setState((s) => ({ ...s, caption: e.target.value }))}
                  placeholder="Tell the story. Use line breaks to make it readable. End with a CTA."
                  rows={6}
                  className="text-sm leading-relaxed"
                  style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}
                />
              </div>
            )}

            {/* Hashtags */}
            {state.platform !== "ig_story" && (
              <div>
                <div className="flex items-end justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A7060" }}>
                    Hashtags
                  </label>
                  <button
                    type="button"
                    onClick={suggestHashtags}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors hover:bg-[#FEF0EA] disabled:opacity-50"
                    style={{ borderColor: "#F5C4BC", backgroundColor: "#FEF0EA", color: "#D4432A" }}
                  >
                    {busy === "hashtags" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Suggest hashtags
                  </button>
                </div>
                <HashtagChips
                  tags={state.hashtags}
                  max={meta.hashtagMax}
                  onChange={(next) => setState((s) => ({ ...s, hashtags: next }))}
                />
              </div>
            )}

            <div className="h-2" />
          </div>

          {/* RIGHT: Live preview */}
          <div
            className="overflow-y-auto px-4 md:px-6 py-6 border-t lg:border-t-0 lg:border-l"
            style={{ borderColor: "#D9CFC2", backgroundColor: "#EDE6DC" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: "#8A7060" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A7060" }}>
                Live preview · {meta.label}
              </span>
            </div>
            {state.media.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, mediaIndex: Math.max(0, s.mediaIndex - 1) }))}
                  disabled={state.mediaIndex === 0}
                  className="h-8 w-8 rounded-full bg-white border flex items-center justify-center disabled:opacity-40"
                  style={{ borderColor: "#E5DDD5", color: "#5A3825" }}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium" style={{ color: "#5A3825" }}>
                  {state.mediaIndex + 1} / {state.media.length}
                </span>
                <button
                  type="button"
                  onClick={() => setState((s) => ({ ...s, mediaIndex: Math.min(s.media.length - 1, s.mediaIndex + 1) }))}
                  disabled={state.mediaIndex >= state.media.length - 1}
                  className="h-8 w-8 rounded-full bg-white border flex items-center justify-center disabled:opacity-40"
                  style={{ borderColor: "#E5DDD5", color: "#5A3825" }}
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <LivePreview state={state} handle={handle} />

            <div className="mt-5 max-w-[360px] mx-auto rounded-2xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: "#D9CFC2", backgroundColor: "rgba(255,255,255,0.6)", color: "#5A3825" }}>
              <p className="font-semibold mb-1" style={{ color: "#2D1810" }}>What you&apos;re seeing</p>
              <p>
                This is a rough preview of how the post will look on {meta.label}. Captions truncate at 3 lines on feed.
                Locally uploaded files (badged <span className="font-bold text-yellow-800">LOCAL</span>) preview here but won&apos;t be saved — paste a hosted URL to persist media.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hub list ───────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  pillar,
  onClick,
}: {
  idea: Idea
  pillar: ContentPillar | null
  onClick: () => void
}) {
  const fmt = FORMAT_BADGE[idea.format] ?? FORMAT_BADGE.post
  const platform = platformFromIdea(idea)
  const platformInfo = platformMeta(platform)
  const desc = idea.hook || idea.caption?.split(/[.\n]/)[0]?.trim() || "No description yet"
  const mediaUrl = idea.media_url && !idea.media_url.startsWith("blob:") ? idea.media_url : null
  const [thumbError, setThumbError] = useState(false)
  const isVideo = mediaUrl ? looksLikeVideoUrl(mediaUrl) : false

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#F97066]/40"
      style={{ borderColor: "#E5DDD5", boxShadow: "0 1px 4px rgba(45,24,16,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: fmt.bg, color: fmt.text }}
        >
          {fmt.icon}
          {fmt.label}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "#FAFAF5", color: "#5A3825" }}
        >
          {platformInfo.icon}
          {platformInfo.short}
        </span>
      </div>

      {mediaUrl && !thumbError && !isVideo && (
        <div
          className="relative rounded-xl overflow-hidden mb-3 bg-[#F5F0EA]"
          style={{ aspectRatio: idea.format === "reel" ? "9 / 16" : "1 / 1" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt={idea.title || "Post preview"}
            className="w-full h-full object-cover"
            onError={() => setThumbError(true)}
          />
        </div>
      )}

      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1.5" style={{ color: "#2D1810" }}>
        {idea.title || "Untitled idea"}
      </h3>

      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: "#7A5C50" }}>
        {desc}
      </p>

      {pillar && (
        <div className="flex items-center gap-1.5 pt-2 border-t" style={{ borderColor: "#F0EAE3" }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pillar.color }} />
          {pillar.emoji && <span className="text-[10px] leading-none">{pillar.emoji}</span>}
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#8A7060" }}>
            {pillar.name}
          </span>
        </div>
      )}
    </button>
  )
}

function PillarTabs({
  pillars,
  active,
  onChange,
  counts,
}: {
  pillars: ContentPillar[]
  active: string
  onChange: (id: string) => void
  counts: Record<string, number>
}) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const tabs = [
    { id: "all", label: "All pillars", color: "#F97066", emoji: null, count: totalCount },
    ...pillars.map((p) => ({ id: p.id, label: p.name, color: p.color, emoji: p.emoji, count: counts[p.id] ?? 0 })),
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
      <div className="inline-flex gap-2 w-max">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium min-h-[44px] border transition-all whitespace-nowrap"
              style={
                isActive
                  ? { backgroundColor: t.color, color: "white", borderColor: t.color }
                  : { backgroundColor: "white", color: "#5A3825", borderColor: "#E5DDD5" }
              }
            >
              {t.id !== "all" && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? "white" : t.color }} />}
              {t.emoji && <span className="text-base leading-none">{t.emoji}</span>}
              <span>{t.label}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={
                  isActive
                    ? { backgroundColor: "rgba(255,255,255,0.25)", color: "white" }
                    : { backgroundColor: "#FAFAF5", color: "#8A7060" }
                }
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function ContentCreatorClient({
  brand,
  initialPillars,
  socialAccounts,
  userId,
}: {
  brand: Brand | null
  initialPillars: ContentPillar[]
  socialAccounts: Record<string, string>
  userId: string
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // If ?pillar=<id> is in the URL, use it to pre-select the pillar and
  // immediately open the editor. We read this once at render time rather than
  // in an effect to avoid any timing / guard issues.
  const urlPillarId = searchParams.get("pillar")

  const [pillars] = useState<ContentPillar[]>(initialPillars)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [activePillarId, setActivePillarId] = useState<string>(urlPillarId ?? "all")
  const [editorOpen, setEditorOpen] = useState(!!urlPillarId)
  const [editorState, setEditorState] = useState<EditorState>(
    urlPillarId ? { ...EMPTY_EDITOR, pillarId: urlPillarId } : EMPTY_EDITOR
  )
  const [migrationNeeded, setMigrationNeeded] = useState(false)

  // Clean up the URL param once on mount so back-navigation doesn't re-open
  useEffect(() => {
    if (urlPillarId) {
      window.history.replaceState({}, "", window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handle = useMemo(() => {
    return (
      socialAccounts.instagram ||
      socialAccounts.tiktok ||
      socialAccounts.youtube ||
      brand?.name?.toLowerCase().replace(/\s+/g, "_") ||
      "yourbrand"
    )
  }, [socialAccounts, brand?.name])

  const fetchIdeas = useCallback(async () => {
    if (!brand) {
      setIdeas([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })
    if (error) {
      const msg = error.message ?? ""
      if (msg.includes("relation") && msg.includes("does not exist")) {
        setMigrationNeeded(true)
      } else {
        toast({ title: "Couldn't load ideas", description: msg, variant: "destructive" })
      }
    }
    setIdeas(data ?? [])
    setLoading(false)
  }, [brand, supabase, toast])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    pillars.forEach((p) => { c[p.id] = 0 })
    c["__unsorted"] = 0
    ideas.forEach((i) => {
      if (i.pillar_id && c[i.pillar_id] !== undefined) c[i.pillar_id]++
      else c["__unsorted"]++
    })
    return c
  }, [ideas, pillars])

  const filteredIdeas = useMemo(() => {
    if (activePillarId === "all") return ideas
    return ideas.filter((i) => i.pillar_id === activePillarId)
  }, [ideas, activePillarId])

  const openNew = () => {
    setEditorState({
      ...EMPTY_EDITOR,
      pillarId: activePillarId === "all" ? null : activePillarId,
    })
    setEditorOpen(true)
  }

  const openExisting = (idea: Idea) => {
    setEditorState(editorFromIdea(idea))
    setEditorOpen(true)
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FEF0EA" }}>
          <Sparkles className="h-8 w-8" style={{ color: "#F97066" }} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: "#2D1810" }}>No brand set up yet</h2>
          <p className="text-sm mt-1" style={{ color: "#8A7060" }}>
            Create a brand profile so the AI can generate content tailored to your niche and tone.
          </p>
        </div>
        <Button asChild style={{ backgroundColor: "#F97066", color: "white" }}>
          <a href="/settings">Set up your brand →</a>
        </Button>
      </div>
    )
  }

  if (migrationNeeded) {
    return (
      <div className="rounded-2xl border px-5 py-6 space-y-3" style={{ backgroundColor: "#FFFBEA", borderColor: "#F5DFA0" }}>
        <p className="text-sm font-semibold" style={{ color: "#6B4D00" }}>Database migration needed</p>
        <p className="text-xs" style={{ color: "#92680A" }}>
          The <code>ideas</code> table doesn&apos;t exist yet. Run the project migrations in Supabase, then refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {pillars.length > 0 ? (
            <PillarTabs pillars={pillars} active={activePillarId} onChange={setActivePillarId} counts={counts} />
          ) : (
            <p className="text-sm" style={{ color: "#8A7060" }}>
              No content pillars yet —{" "}
              <a href="/content-pillars" className="font-semibold underline" style={{ color: "#F97066" }}>
                add some
              </a>{" "}
              to organise your ideas.
            </p>
          )}
        </div>
        <Button
          onClick={openNew}
          className="gap-2 shrink-0 min-h-[44px]"
          style={{ backgroundColor: "#F97066", color: "white" }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New post</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border bg-white p-4 h-[160px] animate-pulse"
              style={{ borderColor: "#E5DDD5" }}
            />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div
          className="rounded-2xl border bg-white px-6 py-16 text-center"
          style={{ borderColor: "#E5DDD5" }}
        >
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#FEF0EA" }}>
            <Sparkles className="h-7 w-7" style={{ color: "#F97066" }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: "#2D1810" }}>
            {activePillarId === "all" ? "No post ideas yet" : "Nothing in this pillar yet"}
          </h3>
          <p className="text-sm mt-1 mb-4" style={{ color: "#8A7060" }}>
            Tap <span className="font-semibold">New post</span> to draft your first idea.
          </p>
          <Button onClick={openNew} className="gap-2" style={{ backgroundColor: "#F97066", color: "white" }}>
            <Plus className="h-4 w-4" />
            New post
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              pillar={pillars.find((p) => p.id === idea.pillar_id) ?? null}
              onClick={() => openExisting(idea)}
            />
          ))}
        </div>
      )}

      <EditorWorkspace
        open={editorOpen}
        state={editorState}
        setState={setEditorState}
        brand={brand}
        pillars={pillars}
        userId={userId}
        onClose={() => setEditorOpen(false)}
        onSaved={fetchIdeas}
        onDeleted={fetchIdeas}
        handle={handle}
      />
    </div>
  )
}
