import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, ExternalLink, Layers, CalendarDays } from "lucide-react"

interface Props {
  params: { id: string }
}

export default async function BrandDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: brand }, { data: pillars }, { data: posts }] = await Promise.all([
    supabase.from("brands").select("*").eq("id", params.id).eq("user_id", user!.id).single(),
    supabase.from("content_pillars").select("*").eq("brand_id", params.id).order("sort_order"),
    supabase.from("posts").select("*").eq("brand_id", params.id).order("scheduled_date", { ascending: true }).limit(10),
  ])

  if (!brand) notFound()

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-100 text-blue-700",
    published: "bg-green-100 text-green-700",
    archived: "bg-[#EDE6DC] text-[#C45A26]",
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title={brand.name} description={brand.niche} />
      <div className="flex-1 px-8 py-6 space-y-6">

        {/* Brand overview */}
        <div className="flex items-center justify-between">
          <div
            className="h-2 rounded-full w-32"
            style={{ background: `linear-gradient(to right, ${brand.primary_color}, ${brand.secondary_color})` }}
          />
          <Link href={`/brands/${brand.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit Brand
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brand Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Niche</p>
                <p className="text-sm text-slate-800">{brand.niche}</p>
              </div>
              {brand.target_audience && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Target Audience</p>
                  <p className="text-sm text-slate-800">{brand.target_audience}</p>
                </div>
              )}
              {brand.tone_of_voice && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Tone of Voice</p>
                  <Badge variant="secondary">{brand.tone_of_voice}</Badge>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Brand Colours</p>
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: brand.primary_color }} />
                    <span className="text-xs font-mono text-slate-600">{brand.primary_color}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: brand.secondary_color }} />
                    <span className="text-xs font-mono text-slate-600">{brand.secondary_color}</span>
                  </div>
                </div>
              </div>
              {brand.website_url && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Website</p>
                  <a
                    href={brand.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    {brand.website_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Pillars */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                Content Pillars
              </CardTitle>
              <Link href="/content-pillars">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">Manage</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!pillars || pillars.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400 mb-3">No content pillars defined yet.</p>
                  <Link href="/content-pillars">
                    <Button size="sm" variant="outline">Add Pillars</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {pillars.map((pillar) => (
                    <div key={pillar.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{pillar.name}</p>
                        {pillar.description && (
                          <p className="text-xs text-slate-500 truncate">{pillar.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
              Recent Content
            </CardTitle>
            <Link href="/content-planner">
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">View Planner</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!posts || posts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400 mb-3">No posts planned for this brand.</p>
                <Link href="/content-planner">
                  <Button size="sm" variant="outline">Plan Content</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-medium text-slate-500 w-20 shrink-0 capitalize">{post.platform}</span>
                    <p className="text-sm text-slate-700 flex-1 truncate">{post.caption_draft ?? "No caption"}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[post.status]}`}>
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
