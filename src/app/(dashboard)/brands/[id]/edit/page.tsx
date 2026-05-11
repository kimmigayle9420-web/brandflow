import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { BrandForm } from "@/components/brands/brand-form"
import { notFound } from "next/navigation"
import type { Brand } from "@/types"

interface Props {
  params: { id: string }
}

export default async function EditBrandPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single()

  const brand = data as Brand | null

  if (!brand) return notFound()

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Edit Brand" description={`Editing ${brand.name}`} />
      <div className="flex-1 px-8 py-6">
        <BrandForm brand={brand} userId={user!.id} />
      </div>
    </div>
  )
}
