import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

interface HeaderProps {
  title: string
  description?: string
}

export async function Header({ title, description }: HeaderProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single()
    : null

  const name = profile?.data?.full_name ?? user?.email ?? ""

  return (
    <header className="flex items-center justify-between border-b bg-white px-8 py-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 leading-tight">{name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.data?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
