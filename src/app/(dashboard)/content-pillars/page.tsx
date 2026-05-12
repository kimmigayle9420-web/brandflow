"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Pencil, Layers, Sparkles, ArrowRight } from "lucide-react"
import type { Brand, ContentPillar } from "@/types"

const PILLAR_COLORS = [
  "#F97066", "#E0A050", "#3A7D44", "#6B5EA8",
  "#C05830", "#2070B8", "#D4432A", "#8B5E10",
  "#5040A0", "#7A5C50",
]

export default function ContentPillarsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const [brands, setBrands] = useState<Brand[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContentPillar | null>(null)
  const [form, setForm] = useState({ name: "", description: "", color: "#F97066" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchBrands = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at")
      if (data) {
        setBrands(data)
        if (data.length > 0 && !selectedBrandId) setSelectedBrandId(data[0].id)
      }
      setLoading(false)
    }
    fetchBrands()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedBrandId) return
    const fetchPillars = async () => {
      const { data } = await supabase
        .from("content_pillars")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("sort_order")
      setPillars(data ?? [])
    }
    fetchPillars()
  }, [selectedBrandId, supabase])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", description: "", color: "#F97066" })
    setDialogOpen(true)
  }

  const togglePillar = (pillarId: string) => {
    setSelectedPillarId((prev) => (prev === pillarId ? null : pillarId))
  }

  const startCreating = (pillarId: string) => {
    router.push(`/content-creator?pillar=${encodeURIComponent(pillarId)}`)
  }

  const openEdit = (pillar: ContentPillar) => {
    setEditing(pillar)
    setForm({ name: pillar.name, description: pillar.description ?? "", color: pillar.color })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (editing) {
      const { error } = await supabase
        .from("content_pillars")
        .update({ name: form.name, description: form.description, color: form.color })
        .eq("id", editing.id)
      if (error) {
        toast({ title: "Failed to update pillar", variant: "destructive" })
      } else {
        setPillars((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...form } : p))
        toast({ title: "Pillar updated!" })
        setDialogOpen(false)
      }
    } else {
      if (pillars.length >= 6) {
        toast({ title: "Maximum 6 pillars per brand", variant: "destructive" })
        setSaving(false)
        return
      }
      const { data, error } = await supabase
        .from("content_pillars")
        .insert({
          brand_id: selectedBrandId,
          user_id: user!.id,
          name: form.name,
          description: form.description,
          color: form.color,
          sort_order: pillars.length,
        })
        .select()
        .single()

      if (error || !data) {
        toast({ title: "Failed to create pillar", variant: "destructive" })
      } else {
        setPillars((prev) => [...prev, data])
        toast({ title: "Pillar created!" })
        setDialogOpen(false)
      }
    }
    setSaving(false)
  }

  const handleDelete = async (pillarId: string) => {
    const pillar = pillars.find((p) => p.id === pillarId)
    if (!window.confirm(`Delete "${pillar?.name ?? "this pillar"}"? This cannot be undone.`)) return
    const { error } = await supabase.from("content_pillars").delete().eq("id", pillarId)
    if (error) {
      toast({ title: "Failed to delete pillar", variant: "destructive" })
    } else {
      setPillars((prev) => prev.filter((p) => p.id !== pillarId))
      toast({ title: "Pillar deleted" })
    }
  }

  const selectedBrand = brands.find((b) => b.id === selectedBrandId)

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FAFAF5" }}>
      <div
        className="px-4 pt-6 pb-5 md:px-8 md:pt-8 md:pb-6"
        style={{ borderBottom: "1px solid #E8E0D5" }}
      >
        <h1 className="text-2xl md:text-3xl font-semibold leading-tight" style={{ color: "#2D1810" }}>
          Content Pillars
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "#8A7060" }}>
          Pick a pillar to start creating content with it, or define a new one.
        </p>
      </div>

      <div className="flex-1 px-4 md:px-8 py-6 space-y-6">
        {/* Brand selector */}
        {brands.length > 1 && (
          <div className="max-w-xs">
            <Label className="mb-2 block text-sm" style={{ color: "#5A3825" }}>Select Brand</Label>
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger style={{ borderColor: "#E5DDD5", backgroundColor: "white" }}>
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
          <p className="text-sm" style={{ color: "#A89080" }}>Loading…</p>
        ) : brands.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed text-center"
            style={{ borderColor: "#E8D8D0", backgroundColor: "#FFF8F4" }}
          >
            <Layers className="h-10 w-10 mb-3" style={{ color: "#C4B5A5" }} />
            <p className="text-sm mb-4" style={{ color: "#8A7060" }}>Create a brand first to add content pillars.</p>
            <Button asChild className="rounded-xl" style={{ backgroundColor: "#F97066", color: "white" }}>
              <a href="/brands/new">Create a Brand</a>
            </Button>
          </div>
        ) : (
          <>
            {selectedBrand && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "#2D1810" }}>{selectedBrand.name}</h2>
                  <p className="text-sm" style={{ color: "#8A7060" }}>{pillars.length}/6 pillars defined · click a pillar to use it</p>
                </div>
                <Button
                  onClick={openCreate}
                  disabled={pillars.length >= 6}
                  className="rounded-xl gap-2"
                  style={{ backgroundColor: "#F97066", color: "white" }}
                >
                  <Plus className="h-4 w-4" />
                  Add Pillar
                </Button>
              </div>
            )}

            {pillars.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-3xl border-2 border-dashed text-center"
                style={{ borderColor: "#E8D8D0", backgroundColor: "#FFF8F4" }}
              >
                <Layers className="h-10 w-10 mb-3" style={{ color: "#C4B5A5" }} />
                <p className="text-sm mb-4" style={{ color: "#8A7060" }}>
                  No pillars yet. Add 3–6 content themes to guide your posting strategy.
                </p>
                <Button
                  onClick={openCreate}
                  className="rounded-xl"
                  style={{ backgroundColor: "#F97066", color: "white" }}
                >
                  Add Your First Pillar
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {pillars.map((pillar, index) => {
                  const isSelected = selectedPillarId === pillar.id
                  return (
                    <div
                      key={pillar.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => togglePillar(pillar.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          togglePillar(pillar.id)
                        }
                      }}
                      className="relative rounded-2xl overflow-hidden transition-all cursor-pointer hover:-translate-y-0.5"
                      style={{
                        backgroundColor: isSelected ? "#FEF0EA" : "white",
                        border: `2px solid ${isSelected ? "#F97066" : "#E5DDD5"}`,
                        boxShadow: isSelected
                          ? "0 0 0 4px rgba(249,112,102,0.15), 0 4px 16px rgba(180,100,60,0.08)"
                          : "0 1px 4px rgba(45,24,16,0.06)",
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: pillar.color }} />
                      <div className="pt-5 pb-4 px-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
                            <h3 className="text-base font-semibold" style={{ color: "#2D1810" }}>{pillar.name}</h3>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: "#A89080" }}>#{index + 1}</span>
                        </div>
                        {pillar.description ? (
                          <p className="text-sm leading-relaxed" style={{ color: "#5A3825" }}>{pillar.description}</p>
                        ) : (
                          <p className="text-sm italic" style={{ color: "#A89080" }}>No description</p>
                        )}

                        {/* Action row */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          <Button
                            size="sm"
                            className="rounded-xl h-8 gap-1.5 text-xs font-semibold"
                            style={{ backgroundColor: "#F97066", color: "white" }}
                            onClick={(e) => {
                              e.stopPropagation()
                              startCreating(pillar.id)
                            }}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Create with this pillar
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl h-8 gap-1 text-xs"
                            style={{ borderColor: "#E5DDD5", color: "#7A5C50" }}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(pillar)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl h-8 gap-1 text-xs"
                            style={{ color: "#A89080" }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(pillar.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pillar" : "New Content Pillar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Pillar Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Behind the Scenes"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What kind of content goes in this pillar?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex gap-2 flex-wrap">
                {PILLAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c, borderColor: form.color === c ? "#2D1810" : "transparent" }}
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              className="rounded-xl"
              style={{ backgroundColor: "#F97066", color: "white" }}
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
