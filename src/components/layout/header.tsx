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
    <header
      className="flex items-center justify-between px-8 py-5"
      style={{ borderBottom: "1px solid #E8E0D5", backgroundColor: "rgba(254,252,248,0.9)" }}
    >
      <div>
        <h1 className="text-2xl font-semibold leading-tight" style={{ color: "#2D1810" }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: "#8A7060" }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-tight" style={{ color: "#2D1810" }}>{name}</p>
          <p className="text-xs" style={{ color: "#8A7060" }}>{user?.email}</p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.data?.avatar_url ?? undefined} />
          <AvatarFallback
            className="text-sm font-medium"
            style={{ backgroundColor: "#FEE8E4", color: "#D4432A" }}
          >
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
