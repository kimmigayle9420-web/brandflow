"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Layers,
  CalendarDays,
  Search,
  Settings,
  Zap,
  LogOut,
  FlaskConical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brands", label: "Brand Profiles", icon: Briefcase },
  { href: "/content-pillars", label: "Content Pillars", icon: Layers },
  { href: "/content-planner", label: "Content Planner", icon: CalendarDays },
  { href: "/content-research", label: "Content Research", icon: FlaskConical },
  { href: "/niche-research", label: "Niche Research", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside
      className="flex h-full w-64 flex-col border-r"
      style={{ backgroundColor: "#FEFCF8", borderColor: "#E5DDD5" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-6 py-5"
        style={{ borderBottom: "1px solid #E5DDD5" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#F97066" }}
        >
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: "#2D1810" }}
        >
          BrandFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "" : "hover:bg-[#FDF5EE]"
              )}
              style={
                isActive
                  ? { backgroundColor: "#FEF0EA", color: "#D4432A" }
                  : { color: "#7A5C50" }
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #E5DDD5" }}>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[#FDF5EE]"
          style={{ color: "#7A5C50" }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
