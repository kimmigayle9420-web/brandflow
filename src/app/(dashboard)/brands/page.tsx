import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Plus, Briefcase, ExternalLink, Pencil } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function BrandsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: brands } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Brand Profiles" description="Manage all your brand identities" />
      <div className="flex-1 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">
            {brands?.length ?? 0} brand{brands?.length !== 1 ? "s" : ""}
          </p>
          <Link href="/brands/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="h-4 w-4" />
              New Brand
            </Button>
          </Link>
        </div>

        {!brands || brands.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No brands yet</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                Create your first brand profile to define your niche, target audience, and visual identity.
              </p>
              <Link href="/brands/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Create Your First Brand
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  {/* Color swatch header */}
                  <div
                    className="h-2 rounded-full mb-4"
                    style={{
                      background: `linear-gradient(to right, ${brand.primary_color}, ${brand.secondary_color})`,
                    }}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-lg truncate">{brand.name}</h3>
                      <p className="text-sm text-indigo-600 font-medium truncate">{brand.niche}</p>
                    </div>
                    <Link href={`/brands/${brand.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>

                  {brand.target_audience && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{brand.target_audience}</p>
                  )}

                  {brand.tone_of_voice && (
                    <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {brand.tone_of_voice}
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Created {formatDate(brand.created_at)}</span>
                    <div className="flex gap-2">
                      {brand.website_url && (
                        <a href={brand.website_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      <Link href={`/brands/${brand.id}`}>
                        <Button variant="outline" size="sm" className="h-8">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
