import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { BrandForm } from "@/components/brands/brand-form"

export default async function NewBrandPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-full">
      <Header title="New Brand" description="Define your brand identity" />
      <div className="flex-1 px-8 py-6">
        <BrandForm userId={user!.id} />
      </div>
    </div>
  )
}
