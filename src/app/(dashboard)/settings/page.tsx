import type { Metadata } from "next"
import { SettingsPageClient } from "./_components/settings-client"

export const metadata: Metadata = {
  title: "Settings — BrandFlow",
  description: "Manage your account, brand, and integrations",
}

export default function SettingsPage() {
  return <SettingsPageClient />
}
