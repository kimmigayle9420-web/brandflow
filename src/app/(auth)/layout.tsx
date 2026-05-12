import { Zap } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 py-10"
      style={{ backgroundColor: "#FAFAF5" }}
    >
      <div className="flex items-center justify-center gap-2 mb-8">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#F97066" }}
        >
          <Zap className="h-6 w-6 text-white" />
        </div>
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: "#2D1810" }}
        >
          BrandFlow
        </span>
      </div>
      <div className="w-full">{children}</div>
    </div>
  )
}
