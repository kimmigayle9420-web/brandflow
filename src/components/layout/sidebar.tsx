"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Settings,
  Zap,
  LogOut,
  PenLine,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/content-creator", label: "Content Creator", mobileLabel: "Create", icon: PenLine },
  { href: "/content-planner", label: "Content Planner", mobileLabel: "Plan", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", mobileLabel: "Calendar", icon: CalendarRange },
  { href: "/settings", label: "Settings", mobileLabel: "Settings", icon: Settings },
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
    <>
      {/* ── Desktop sidebar (md and above) ── */}
      <aside
        className="hidden md:flex h-full w-64 flex-col border-r shrink-0"
        style={{ backgroundColor: "#2D2D2D", borderColor: "#2D2D2D" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#E06A33" }}
          >
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: "#FFFFFF" }}
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
                  isActive ? "" : "hover:bg-white/5"
                )}
                style={
                  isActive
                    ? { backgroundColor: "#E06A33", color: "#FFFFFF" }
                    : { color: "#EDE6DC" }
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: "#EDE6DC" }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (below md) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t"
        style={{
          backgroundColor: "#2D2D2D",
          borderColor: "#2D2D2D",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
              style={{ minHeight: "60px", minWidth: 0 }}
            >
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: "40px",
                  height: "28px",
                  backgroundColor: isActive ? "#E06A33" : "transparent",
                }}
              >
                <Icon
                  style={{
                    width: "20px",
                    height: "20px",
                    color: isActive ? "#FFFFFF" : "#EDE6DC",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-medium leading-none text-center"
                style={{ color: isActive ? "#FFFFFF" : "#EDE6DC" }}
              >
                {item.mobileLabel}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
