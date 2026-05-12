"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Pencil, Layers } from "lucide-react"
import type { Brand, ContentPillar } from "@/types"

const PILLAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#64748b",
]

export default function ContentPillarsPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const [brands, setBrands] = useState<Brand[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContentPillar | null>(null)
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" })
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
    setForm({ name: "", description: "", color: "#6366f1" })
    setDialogOpen(true)
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
    <div className="flex flex-col min-h-full">
      <div className="flex items-center justify-between border-b bg-white px-8 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Content Pillars</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define 3–6 content themes per brand</p>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {/* Brand selector */}
        {brands.length > 1 && (
          <div className="max-w-xs">
            <Label className="mb-2 block text-sm">Select Brand</Label>
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
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 mb-4">Create a brand first to add content pillars.</p>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                <a href="/brands/new">Create a Brand</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedBrand && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">{selectedBrand.name}</h2>
                  <p className="text-sm text-slate-500">{pillars.length}/6 pillars defined</p>
                </div>
                <Button
                  onClick={openCreate}
                  disabled={pillars.length >= 6}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Pillar
                </Button>
              </div>
            )}

            {pillars.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    No pillars yet. Add 3–6 content themes to guide your posting strategy.
                  </p>
                  <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">Add Your First Pillar</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {pillars.map((pillar, index) => (
                  <Card key={pillar.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: pillar.color }} />
                    <CardHeader className="pt-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
                          <CardTitle className="text-base">{pillar.name}</CardTitle>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">#{index + 1}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {pillar.description ? (
                        <CardDescription className="text-sm">{pillar.description}</CardDescription>
                      ) : (
                        <CardDescription className="text-sm italic">No description</CardDescription>
                      )}
                      <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => openEdit(pillar)}>
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDelete(pillar.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-slate-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
