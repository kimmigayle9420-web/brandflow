"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { TONES } from "@/lib/utils"
import type { Brand } from "@/types"

interface BrandFormProps {
  brand?: Brand
  userId: string
}

export function BrandForm({ brand, userId }: BrandFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: brand?.name ?? "",
    niche: brand?.niche ?? "",
    target_audience: brand?.target_audience ?? "",
    tone_of_voice: brand?.tone_of_voice ?? "",
    primary_color: brand?.primary_color ?? "#6366f1",
    secondary_color: brand?.secondary_color ?? "#a5b4fc",
    website_url: brand?.website_url ?? "",
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (brand) {
      const { error } = await supabase
        .from("brands")
        .update(form)
        .eq("id", brand.id)

      if (error) {
        toast({ title: "Failed to update brand", description: error.message, variant: "destructive" })
        setLoading(false)
        return
      }
      toast({ title: "Brand updated successfully!" })
      router.push(`/brands/${brand.id}`)
    } else {
      const { error } = await supabase
        .from("brands")
        .insert({ ...form, user_id: userId })

      if (error) {
        toast({ title: "Failed to create brand", description: error.message, variant: "destructive" })
        setLoading(false)
        return
      }
      toast({ title: "Brand created successfully!" })
      router.push("/brands")
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="name">Brand Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g. Glow Beauty Co."
            required
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="niche">Niche / Industry *</Label>
          <Input
            id="niche"
            value={form.niche}
            onChange={(e) => handleChange("niche", e.target.value)}
            placeholder="e.g. Sustainable skincare for Gen Z"
            required
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="target_audience">Target Audience</Label>
          <Textarea
            id="target_audience"
            value={form.target_audience}
            onChange={(e) => handleChange("target_audience", e.target.value)}
            placeholder="e.g. Women aged 20–35 who care about eco-friendly beauty, follow skincare influencers, and shop online"
            rows={3}
          />
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="tone_of_voice">Tone of Voice</Label>
          <Select value={form.tone_of_voice} onValueChange={(v) => handleChange("tone_of_voice", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tone…" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>{tone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_color">Primary Colour</Label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              id="primary_color"
              value={form.primary_color}
              onChange={(e) => handleChange("primary_color", e.target.value)}
              className="h-10 w-16 rounded-md border border-input cursor-pointer"
            />
            <Input
              value={form.primary_color}
              onChange={(e) => handleChange("primary_color", e.target.value)}
              placeholder="#6366f1"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary_color">Secondary Colour</Label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              id="secondary_color"
              value={form.secondary_color}
              onChange={(e) => handleChange("secondary_color", e.target.value)}
              className="h-10 w-16 rounded-md border border-input cursor-pointer"
            />
            <Input
              value={form.secondary_color}
              onChange={(e) => handleChange("secondary_color", e.target.value)}
              placeholder="#a5b4fc"
              className="font-mono"
            />
          </div>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            type="url"
            value={form.website_url}
            onChange={(e) => handleChange("website_url", e.target.value)}
            placeholder="https://yourbrand.com"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
          {loading ? "Saving…" : brand ? "Update Brand" : "Create Brand"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
