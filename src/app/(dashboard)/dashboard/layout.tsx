import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard — BrandFlow",
  description: "Your creative brand hub",
}

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
