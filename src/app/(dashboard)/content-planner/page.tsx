"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus, Pencil, Trash2, CalendarDays, List,
  Sparkles, Loader2, Lightbulb, X, Copy, Check,
  Film, Image, BookOpen, LayoutGrid
} from "lucide-react"
import { formatDate, PLATFORMS, STATUSES, FORMAT_OPTIONS } from "@/lib/utils"
import type { Brand, ContentPillar, Post, PostFormat } from "@/types"
import type { GenerateRequest } from "@/app/api/generate/route"

// ── AI helper ────────────────────────────────────────────────────────────────
async function callGenerate(body: GenerateRequest): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed")
  return data.result as string
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
  return JSON.parse(cleaned) as T
}

// ── Format result types ──────────────────────────────────────────────────────
interface CarouselResult {
  format: "carousel"
  hookSlide: { title: string; subtitle?: string }
  slides: { number: number; title: string; keyPoint: string }[]
  ctaSlide: { headline: string; action: string }
  hookOptions: string[]
}

interface ReelResult {
  format: "reel"
  hook: string
  scenes: { number: number; point: string; duration: string }[]
  cta: string
  captionHookOptions: string[]
}

interface StoryResult {
  format: "story"
  frames: { number: number; visualIdea: string; textOverlay: string; action?: string }[]
  engagementPrompt: { type: string; content: string; options?: string[] }
  captionHookOptions: string[]
}

interface StaticResult {
  format: "static"
  caption: string
  hashtags: { broad: string[]; niche: string[]; specific: string[] }
  captionHookOptions: string[]
}

type FormatResult = CarouselResult | ReelResult | StoryResult | StaticResult

// ── Post idea types ──────────────────────────────────────────────────────────
interface PostIdea {
  format: string
  title: string
  description: string
}

function parsePostIdeas(raw: string): PostIdea[] {
  return raw
    .split("\n")
    .filter((line) => /^\d+\./.test(line.trim()))
    .map((line) => {
      const body = line.replace(/^\d+\.\s*/, "").trim()
      const formatMatch = body.match(/^\[([^\]]+)\]\s*(.+)/)
      if (!formatMatch) return { format: "Post", title: body, description: "" }
      const rest = formatMatch[2]
      const dashIdx = rest.indexOf(" — ")
      if (dashIdx === -1) return { format: formatMatch[1], title: rest, description: "" }
      return {
        format: formatMatch[1],
        title: rest.slice(0, dashIdx).trim(),
        description: rest.slice(dashIdx + 3).trim(),
      }
    })
    .filter((idea) => idea.title)
}

// ── Format icon helper ───────────────────────────────────────────────────────
function FormatIcon({ format, className }: { format: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    carousel: <LayoutGrid className={className} />,
    reel: <Film className={className} />,
    story: <BookOpen className={className} />,
    static: <Image className={className} />,
  }
  return <>{icons[format] ?? <Image className={className} />}</>
}

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button
      size="icon"
      variant="ghost"
      className={`h-6 w-6 shrink-0 ${className ?? ""}`}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}

// ── Format badge ─────────────────────────────────────────────────────────────
function FormatBadge({ format }: { format: string }) {
  const opt = FORMAT_OPTIONS.find((f) => f.value === format)
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${opt?.color ?? "bg-slate-100 text-slate-600"}`}>
      <FormatIcon format={format} className="h-3 w-3" />
      {opt?.label ?? format}
    </span>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ContentPlannerPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const [brands, setBrands] = useState<Brand[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Post dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)

  // AI state in dialog
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generatingHashtags, setGeneratingHashtags] = useState(false)
  const [generatingFormat, setGeneratingFormat] = useState(false)

  // Format AI results panel
  const [formatPanelOpen, setFormatPanelOpen] = useState(false)
  const [formatResult, setFormatResult] = useState<FormatResult | null>(null)

  // Post ideas panel
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [generatingIdeas, setGeneratingIdeas] = useState(false)
  const [postIdeas, setPostIdeas] = useState<PostIdea[]>([])

  const defaultForm = {
    platform: "instagram" as const,
    format: "static" as PostFormat,
    caption_draft: "",
    hashtags: "",
    scheduled_date: "",
    status: "draft" as const,
    notes: "",
    pillar_id: "",
  }
  const [form, setForm] = useState(defaultForm)

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: brandsData } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at")
      if (brandsData?.length) {
        setBrands(brandsData)
        setSelectedBrandId(brandsData[0].id)
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBrandId) return
    const fetchData = async () => {
      const [{ data: p }, { data: po }] = await Promise.all([
        supabase.from("content_pillars").select("*").eq("brand_id", selectedBrandId).order("sort_order"),
        supabase.from("posts").select("*").eq("brand_id", selectedBrandId).order("scheduled_date", { ascending: true }),
      ])
      setPillars(p ?? [])
      setPosts(po ?? [])
    }
    fetchData()
  }, [selectedBrandId, supabase])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const selectedBrand = brands.find((b) => b.id === selectedBrandId)
  const selectedPillar = pillars.find((p) => p.id === form.pillar_id)

  const aiContext = (): Omit<GenerateRequest, "type"> => ({
    brandName: selectedBrand?.name,
    niche: selectedBrand?.niche,
    toneOfVoice: selectedBrand?.tone_of_voice ?? undefined,
    targetAudience: selectedBrand?.target_audience ?? undefined,
    pillarName: selectedPillar?.name,
    pillarDescription: selectedPillar?.description ?? undefined,
    platform: form.platform,
    captionDraft: form.caption_draft,
    format: form.format,
  })

  const showAiError = (err: unknown) =>
    toast({
      title: "Generation failed",
      description: err instanceof Error ? err.message : "Please check your ANTHROPIC_API_KEY.",
      variant: "destructive",
    })

  // ── AI actions ───────────────────────────────────────────────────────────

  const handleGenerateCaption = async () => {
    setGeneratingCaption(true)
    try {
      const result = await callGenerate({ type: "caption", ...aiContext() })
      setForm((p) => ({ ...p, caption_draft: result.trim() }))
      toast({ title: "Caption generated!" })
    } catch (err) { showAiError(err) }
    setGeneratingCaption(false)
  }

  const handleGenerateHashtags = async () => {
    setGeneratingHashtags(true)
    try {
      const result = await callGenerate({ type: "hashtags", ...aiContext() })
      setForm((p) => ({ ...p, hashtags: result.trim() }))
      toast({ title: "Hashtags generated!" })
    } catch (err) { showAiError(err) }
    setGeneratingHashtags(false)
  }

  const handleGenerateForFormat = async () => {
    setGeneratingFormat(true)
    setFormatResult(null)
    setFormatPanelOpen(true)
    try {
      const raw = await callGenerate({ type: "format_content", ...aiContext() })
      const parsed = parseJson<FormatResult>(raw)
      setFormatResult(parsed)
    } catch (err) {
      showAiError(err)
      setFormatPanelOpen(false)
    }
    setGeneratingFormat(false)
  }

  const handleGeneratePostIdeas = async () => {
    setGeneratingIdeas(true)
    setPostIdeas([])
    setIdeasOpen(true)
    try {
      const result = await callGenerate({
        type: "post_ideas",
        brandName: selectedBrand?.name,
        niche: selectedBrand?.niche,
        toneOfVoice: selectedBrand?.tone_of_voice ?? undefined,
        targetAudience: selectedBrand?.target_audience ?? undefined,
        pillarName: pillars.map((p) => p.name).join(", "),
      })
      setPostIdeas(parsePostIdeas(result))
    } catch (err) {
      showAiError(err)
      setIdeasOpen(false)
    }
    setGeneratingIdeas(false)
  }

  const handleUseIdea = (idea: PostIdea) => {
    setEditing(null)
    setForm({
      ...defaultForm,
      caption_draft: `${idea.title}${idea.description ? `\n\n${idea.description}` : ""}`,
    })
    setIdeasOpen(false)
    setDialogOpen(true)
  }

  const useHookAsCaption = (hook: string) => {
    setForm((p) => ({ ...p, caption_draft: hook }))
    setFormatPanelOpen(false)
    toast({ title: "Hook added as caption draft" })
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setFormatResult(null)
    setDialogOpen(true)
  }

  const openEdit = (post: Post) => {
    setEditing(post)
    setForm({
      platform: post.platform,
      format: (post.format as PostFormat) ?? "static",
      caption_draft: post.caption_draft ?? "",
      hashtags: post.hashtags ?? "",
      scheduled_date: post.scheduled_date ?? "",
      status: post.status,
      notes: post.notes ?? "",
      pillar_id: post.pillar_id ?? "",
    })
    setFormatResult(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      platform: form.platform,
      format: form.format,
      caption_draft: form.caption_draft || null,
      hashtags: form.hashtags || null,
      scheduled_date: form.scheduled_date || null,
      status: form.status,
      notes: form.notes || null,
      pillar_id: form.pillar_id || null,
    }

    if (editing) {
      const { error } = await supabase.from("posts").update(payload).eq("id", editing.id)
      if (error) {
        toast({ title: "Failed to update post", variant: "destructive" })
      } else {
        setPosts((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...payload } : p))
        toast({ title: "Post updated!" })
        setDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from("posts")
        .insert({ ...payload, brand_id: selectedBrandId, user_id: user!.id })
        .select()
        .single()
      if (error || !data) {
        toast({ title: "Failed to create post", variant: "destructive" })
      } else {
        setPosts((prev) => [...prev, data].sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "")))
        toast({ title: "Post created!" })
        setDialogOpen(false)
      }
    }
    setSaving(false)
  }

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId)
    if (error) {
      toast({ title: "Failed to delete post", variant: "destructive" })
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast({ title: "Post deleted" })
    }
  }

  // ── UI helpers ───────────────────────────────────────────────────────────

  const getStatusStyle = (status: string) =>
    STATUSES.find((s) => s.value === status)?.color ?? "bg-slate-100 text-slate-600"

  const getPillarColor = (pillarId: string | null) => {
    if (!pillarId) return "#cbd5e1"
    return pillars.find((p) => p.id === pillarId)?.color ?? "#cbd5e1"
  }

  const formatLabel = (fmt: string) =>
    FORMAT_OPTIONS.find((f) => f.value === fmt)?.label ?? fmt

  const groupedByMonth: Record<string, Post[]> = {}
  posts.forEach((post) => {
    const key = post.scheduled_date
      ? new Date(post.scheduled_date).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
      : "Unscheduled"
    if (!groupedByMonth[key]) groupedByMonth[key] = []
    groupedByMonth[key].push(post)
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-8 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Content Planner</h1>
          <p className="text-sm text-slate-500 mt-0.5">Plan and track all your posts</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBrandId && (
            <Button
              variant="outline"
              onClick={handleGeneratePostIdeas}
              disabled={generatingIdeas}
              className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
            >
              {generatingIdeas ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              {generatingIdeas ? "Generating…" : "Post Ideas"}
            </Button>
          )}
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-5">
        {/* Brand filter */}
        {brands.length > 1 && (
          <div className="max-w-xs">
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a brand…" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : brands.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Create a brand first to plan content.</p>
              <Button asChild className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                <a href="/brands/new">Create a Brand</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>

            {/* ── List View ───────────────────────────────────────────────── */}
            <TabsContent value="list" className="mt-4">
              {posts.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                  <CardContent className="py-12 flex flex-col items-center text-center">
                    <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 mb-4">No posts planned yet.</p>
                    <div className="flex gap-2">
                      <Button onClick={handleGeneratePostIdeas} variant="outline" className="gap-2 text-indigo-600 border-indigo-200">
                        <Lightbulb className="h-4 w-4" />
                        Get AI Ideas
                      </Button>
                      <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">Plan Your First Post</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <div className="col-span-1">Pillar</div>
                    <div className="col-span-2">Platform</div>
                    <div className="col-span-2">Format</div>
                    <div className="col-span-4">Caption</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1"></div>
                  </div>
                  {posts.map((post) => (
                    <Card key={post.id} className="hover:shadow-sm transition-shadow group">
                      <CardContent className="py-3 px-4">
                        <div className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-1">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: getPillarColor(post.pillar_id) }}
                              title={pillars.find((p) => p.id === post.pillar_id)?.name ?? "No pillar"}
                            />
                          </div>
                          <div className="col-span-2">
                            <span className="text-sm capitalize text-slate-600">{post.platform}</span>
                          </div>
                          <div className="col-span-2">
                            <FormatBadge format={post.format ?? "static"} />
                          </div>
                          <div className="col-span-4">
                            <p className="text-sm text-slate-800 truncate">{post.caption_draft ?? "No caption"}</p>
                            {post.hashtags && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{post.hashtags}</p>
                            )}
                          </div>
                          <div className="col-span-1">
                            <span className="text-sm text-slate-500">
                              {post.scheduled_date ? formatDate(post.scheduled_date) : "—"}
                            </span>
                          </div>
                          <div className="col-span-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(post.status)}`}>
                              {post.status}
                            </span>
                          </div>
                          <div className="col-span-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(post)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(post.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Calendar / Month grouped view ─────────────────────────── */}
            <TabsContent value="calendar" className="mt-4">
              {Object.keys(groupedByMonth).length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                  <CardContent className="py-12 flex flex-col items-center text-center">
                    <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 mb-4">No posts planned yet.</p>
                    <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">Plan Your First Post</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedByMonth).map(([month, monthPosts]) => (
                    <div key={month}>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{month}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {monthPosts.map((post) => (
                          <Card key={post.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: getPillarColor(post.pillar_id) }} />
                            <CardContent className="pl-5 py-3 pr-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-xs font-medium text-slate-500 capitalize">{post.platform}</span>
                                    <FormatBadge format={post.format ?? "static"} />
                                    {post.scheduled_date && (
                                      <>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-xs text-slate-500">{formatDate(post.scheduled_date)}</span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-800 line-clamp-2">
                                    {post.caption_draft ?? "No caption yet"}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(post.status)}`}>
                                    {post.status}
                                  </span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(post)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => handleDelete(post.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* ── Post Ideas Panel ──────────────────────────────────────────────── */}
      <Dialog open={ideasOpen} onOpenChange={setIdeasOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI Post Ideas for {selectedBrand?.name}
            </DialogTitle>
          </DialogHeader>

          {generatingIdeas ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">Claude is generating ideas for your brand…</p>
            </div>
          ) : (
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              {postIdeas.map((idea, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                        {idea.format}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{idea.title}</p>
                    {idea.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{idea.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => handleUseIdea(idea)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Use idea
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIdeasOpen(false)}>Close</Button>
            <Button
              onClick={handleGeneratePostIdeas}
              disabled={generatingIdeas}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {generatingIdeas ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Format AI Results Panel ───────────────────────────────────────── */}
      <Dialog open={formatPanelOpen} onOpenChange={setFormatPanelOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              {formatLabel(form.format)} Content — AI Generated
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
            {generatingFormat && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-800">Claude is building your {formatLabel(form.format)}…</p>
                  <p className="text-sm text-slate-500 mt-1">Structuring content for {form.platform}</p>
                </div>
              </div>
            )}

            {/* ── Carousel results ── */}
            {formatResult?.format === "carousel" && (
              <>
                {/* Hook slide */}
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Hook Slide</p>
                    <CopyButton text={`${formatResult.hookSlide.title}${formatResult.hookSlide.subtitle ? `\n${formatResult.hookSlide.subtitle}` : ""}`} />
                  </div>
                  <p className="font-semibold text-slate-800">{formatResult.hookSlide.title}</p>
                  {formatResult.hookSlide.subtitle && (
                    <p className="text-sm text-slate-600 mt-0.5">{formatResult.hookSlide.subtitle}</p>
                  )}
                </div>

                {/* Slides */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Slides</p>
                  {formatResult.slides.map((slide) => (
                    <div key={slide.number} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {slide.number}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{slide.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{slide.keyPoint}</p>
                      </div>
                      <CopyButton text={`${slide.title}\n${slide.keyPoint}`} />
                    </div>
                  ))}
                </div>

                {/* CTA slide */}
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">CTA Slide</p>
                    <CopyButton text={`${formatResult.ctaSlide.headline}\n${formatResult.ctaSlide.action}`} />
                  </div>
                  <p className="font-semibold text-slate-800">{formatResult.ctaSlide.headline}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{formatResult.ctaSlide.action}</p>
                </div>

                {/* Hook options */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption Hook Options</p>
                  {formatResult.hookOptions.map((hook, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-slate-700 flex-1 italic">"{hook}"</p>
                      <div className="flex gap-1 shrink-0">
                        <CopyButton text={hook} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => useHookAsCaption(hook)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Reel results ── */}
            {formatResult?.format === "reel" && (
              <>
                {/* Hook */}
                <div className="rounded-lg border border-pink-200 bg-pink-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">3-Second Hook</p>
                    <CopyButton text={formatResult.hook} />
                  </div>
                  <p className="font-semibold text-slate-800 italic">"{formatResult.hook}"</p>
                </div>

                {/* Scenes */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Script Scenes</p>
                  {formatResult.scenes.map((scene) => (
                    <div key={scene.number} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="h-6 w-6 rounded-full bg-pink-100 text-pink-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {scene.number}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800">{scene.point}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{scene.duration}</p>
                      </div>
                      <CopyButton text={scene.point} />
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Closing CTA</p>
                    <CopyButton text={formatResult.cta} />
                  </div>
                  <p className="text-sm text-slate-800">{formatResult.cta}</p>
                </div>

                {/* Caption hook options */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption Hook Options</p>
                  {formatResult.captionHookOptions.map((hook, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-slate-700 flex-1 italic">"{hook}"</p>
                      <div className="flex gap-1 shrink-0">
                        <CopyButton text={hook} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => useHookAsCaption(hook)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Story results ── */}
            {formatResult?.format === "story" && (
              <>
                {/* Frames */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Story Frames</p>
                  {formatResult.frames.map((frame) => (
                    <div key={frame.number} className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                            {frame.number}
                          </div>
                          <span className="text-xs font-semibold text-blue-700">Frame {frame.number}</span>
                        </div>
                        <CopyButton text={`Visual: ${frame.visualIdea}\nText: ${frame.textOverlay}${frame.action ? `\nAction: ${frame.action}` : ""}`} />
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-xs font-medium text-slate-400">Visual:</span>
                          <p className="text-sm text-slate-700 mt-0.5">{frame.visualIdea}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-400">Text overlay:</span>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">"{frame.textOverlay}"</p>
                        </div>
                        {frame.action && (
                          <div>
                            <span className="text-xs font-medium text-slate-400">Action:</span>
                            <p className="text-xs text-slate-500 mt-0.5">{frame.action}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Engagement prompt */}
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                      Engagement — {formatResult.engagementPrompt.type}
                    </p>
                    <CopyButton text={formatResult.engagementPrompt.content} />
                  </div>
                  <p className="text-sm font-medium text-slate-800">{formatResult.engagementPrompt.content}</p>
                  {formatResult.engagementPrompt.options && (
                    <div className="flex gap-2 mt-2">
                      {formatResult.engagementPrompt.options.map((opt, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Caption hook options */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption / Link Options</p>
                  {formatResult.captionHookOptions.map((hook, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-slate-700 flex-1 italic">"{hook}"</p>
                      <div className="flex gap-1 shrink-0">
                        <CopyButton text={hook} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => useHookAsCaption(hook)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Static results ── */}
            {formatResult?.format === "static" && (
              <>
                {/* Caption */}
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption</p>
                    <div className="flex gap-1">
                      <CopyButton text={formatResult.caption} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-indigo-600"
                        onClick={() => { setForm((p) => ({ ...p, caption_draft: formatResult.caption })); setFormatPanelOpen(false) }}
                      >
                        Use caption
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{formatResult.caption}</p>
                </div>

                {/* Hashtags */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hashtag Strategy</p>
                  {[
                    { label: "Broad (high volume)", tags: formatResult.hashtags.broad, color: "bg-slate-100 text-slate-700" },
                    { label: "Niche (medium volume)", tags: formatResult.hashtags.niche, color: "bg-indigo-100 text-indigo-700" },
                    { label: "Specific (low volume)", tags: formatResult.hashtags.specific, color: "bg-purple-100 text-purple-700" },
                  ].map(({ label, tags, color }) => (
                    <div key={label} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-500">{label}</p>
                        <CopyButton text={tags.join(" ")} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-indigo-600 border-indigo-200"
                    onClick={() => {
                      const all = [...formatResult.hashtags.broad, ...formatResult.hashtags.niche, ...formatResult.hashtags.specific].join(" ")
                      setForm((p) => ({ ...p, hashtags: all }))
                      setFormatPanelOpen(false)
                    }}
                  >
                    Use all hashtags
                  </Button>
                </div>

                {/* Hook options */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alternative Hooks</p>
                  {formatResult.captionHookOptions.map((hook, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group">
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-slate-700 flex-1 italic">"{hook}"</p>
                      <div className="flex gap-1 shrink-0">
                        <CopyButton text={hook} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => useHookAsCaption(hook)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormatPanelOpen(false)}>Close</Button>
            <Button
              onClick={handleGenerateForFormat}
              disabled={generatingFormat}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {generatingFormat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Post Editor Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Post" : "Plan a Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">

            {/* Format selector — full width, prominent */}
            <div className="space-y-2">
              <Label>Content Format</Label>
              <div className="grid grid-cols-4 gap-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, format: opt.value as PostFormat }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                      form.format === opt.value
                        ? `${opt.color} border-current`
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <FormatIcon format={opt.value} className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm((p) => ({ ...p, platform: v as typeof form.platform }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((pl) => (
                      <SelectItem key={pl.value} value={pl.value}>{pl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as typeof form.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
              />
            </div>

            {pillars.length > 0 && (
              <div className="space-y-2">
                <Label>Content Pillar</Label>
                <Select value={form.pillar_id} onValueChange={(v) => setForm((p) => ({ ...p, pillar_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {pillars.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Format AI Generate button */}
            {selectedBrandId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateForFormat}
                disabled={generatingFormat}
                className="w-full gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
              >
                {generatingFormat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingFormat
                  ? "Generating…"
                  : `✨ Generate for ${formatLabel(form.format)}`}
              </Button>
            )}

            {/* Caption + AI button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Caption Draft</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateCaption}
                  disabled={generatingCaption || !selectedBrandId}
                  className="h-7 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  {generatingCaption ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {generatingCaption ? "Writing…" : "Quick caption"}
                </Button>
              </div>
              <Textarea
                value={form.caption_draft}
                onChange={(e) => setForm((p) => ({ ...p, caption_draft: e.target.value }))}
                placeholder="Write your caption here, or use AI to generate…"
                rows={4}
                className={generatingCaption ? "opacity-60" : ""}
              />
              {generatingCaption && (
                <p className="text-xs text-indigo-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Claude is writing a caption based on your brand context…
                </p>
              )}
            </div>

            {/* Hashtags + AI button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hashtags</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateHashtags}
                  disabled={generatingHashtags || !selectedBrandId}
                  className="h-7 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  {generatingHashtags ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {generatingHashtags ? "Generating…" : "Generate hashtags"}
                </Button>
              </div>
              <Textarea
                value={form.hashtags}
                onChange={(e) => setForm((p) => ({ ...p, hashtags: e.target.value }))}
                placeholder="#brand #niche — or click 'Generate hashtags'"
                rows={3}
                className={generatingHashtags ? "opacity-60" : ""}
              />
              {generatingHashtags && (
                <p className="text-xs text-indigo-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Building hashtag clusters for your niche…
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes, image ideas, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update Post" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
