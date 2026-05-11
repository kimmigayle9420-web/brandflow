import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Briefcase, Layers, CalendarDays, ArrowRight, TrendingUp } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: brands }, { data: posts }, { data: pillars }] = await Promise.all([
    supabase.from("brands").select("*").eq("user_id", user!.id),
    supabase.from("posts").select("*, content_pillars(name, color)").eq("user_id", user!.id).order("scheduled_date", { ascending: true }).limit(5),
    supabase.from("content_pillars").select("*").eq("user_id", user!.id),
  ])

  const draftCount = posts?.filter((p) => p.status === "draft").length ?? 0
  const scheduledCount = posts?.filter((p) => p.status === "scheduled").length ?? 0

  const profile = await supabase.from("profiles").select("full_name").eq("id", user!.id).single()
  const firstName = profile.data?.full_name?.split(" ")[0] ?? "there"

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard" description={`Welcome back, ${firstName}!`} />
      <div className="flex-1 px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Brand Profiles</CardTitle>
              <Briefcase className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{brands?.length ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                {brands?.length === 0 ? "Create your first brand" : "Active brands"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Content Pillars</CardTitle>
              <Layers className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{pillars?.length ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">Across all brands</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Scheduled Posts</CardTitle>
              <CalendarDays className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{scheduledCount}</div>
              <p className="text-xs text-slate-500 mt-1">{draftCount} drafts in progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions + recent posts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Jump into what matters most</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/brands/new">
                <Button variant="outline" className="w-full justify-between hover:bg-indigo-50 hover:border-indigo-300">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-indigo-500" />
                    Create a new brand
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/content-pillars">
                <Button variant="outline" className="w-full justify-between hover:bg-purple-50 hover:border-purple-300">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-500" />
                    Define content pillars
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/content-planner">
                <Button variant="outline" className="w-full justify-between hover:bg-emerald-50 hover:border-emerald-300">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-500" />
                    Plan your content
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/niche-research">
                <Button variant="outline" className="w-full justify-between hover:bg-orange-50 hover:border-orange-300">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Research your niche
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming posts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Upcoming Posts</CardTitle>
                <CardDescription>Your next scheduled content</CardDescription>
              </div>
              <Link href="/content-planner">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!posts || posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">No posts planned yet.</p>
                  <Link href="/content-planner" className="mt-2">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 mt-2">
                      Plan a post
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {post.caption_draft ?? "No caption yet"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 capitalize">{post.platform}</span>
                          {post.scheduled_date && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-slate-500">{formatDate(post.scheduled_date)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={
                          post.status === "published" ? "bg-green-100 text-green-700 border-0" :
                          post.status === "scheduled" ? "bg-blue-100 text-blue-700 border-0" :
                          post.status === "archived" ? "bg-orange-100 text-orange-700 border-0" :
                          "bg-slate-100 text-slate-700 border-0"
                        }
                      >
                        {post.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* No brands onboarding nudge */}
        {(!brands || brands.length === 0) && (
          <Card className="border-dashed border-2 border-indigo-200 bg-indigo-50/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Set up your first brand</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                Define your brand identity — niche, audience, tone, and colors — to unlock content planning tools.
              </p>
              <Link href="/brands/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Create Brand Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
