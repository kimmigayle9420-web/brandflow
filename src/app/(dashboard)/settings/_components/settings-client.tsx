"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getInitials, TONES } from "@/lib/utils"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react"
import type { Brand, SocialAccount, SocialAccountsMap } from "@/types"
import { normalizeSocialAccounts } from "@/lib/social-accounts"
import { saveSocialStats } from "@/app/(dashboard)/dashboard/_actions/social-accounts"

// ── Helpers ────────────────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { emoji: string; name: string; bg: string }> = {
  instagram: { emoji: "📸", name: "Instagram", bg: "bg-gradient-to-br from-pink-500 to-orange-400" },
  tiktok:    { emoji: "🎵", name: "TikTok",    bg: "bg-gradient-to-br from-slate-800 to-slate-900" },
  youtube:   { emoji: "▶️", name: "YouTube",   bg: "bg-gradient-to-br from-red-500 to-red-600" },
  twitter:   { emoji: "𝕏",  name: "X / Twitter", bg: "bg-gradient-to-br from-slate-700 to-slate-900" },
  pinterest: { emoji: "📌", name: "Pinterest", bg: "bg-gradient-to-br from-rose-500 to-red-600" },
  facebook:  { emoji: "👥", name: "Facebook",  bg: "bg-gradient-to-br from-blue-500 to-blue-700" },
  linkedin:  { emoji: "💼", name: "LinkedIn",  bg: "bg-gradient-to-br from-blue-700 to-blue-800" },
}

const AVATAR_COLORS = [
  "#E06A33", "#C45A26", "#C45A26", "#B07D10", "#4CAF70",
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const MIGRATION_SQL = `-- Migration 1: Upgrade content pillars
ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS voice_direction text;
ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS format_preference text DEFAULT 'any';
ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS weekly_quota int DEFAULT 2;

-- Migration 2: Create ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES content_pillars(id) ON DELETE SET NULL,
  format text CHECK (format IN ('post', 'carousel', 'reel')) NOT NULL DEFAULT 'post',
  title text,
  hook text,
  caption text,
  hashtags text,
  slides jsonb,
  script jsonb,
  media_url text,
  status text CHECK (status IN ('idea', 'draft', 'scheduled', 'posted')) NOT NULL DEFAULT 'idea',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ideas" ON ideas FOR ALL USING (auth.uid() = user_id);`

// ── Section wrapper ────────────────────────────────────────────────────────────

function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-3xl p-6 space-y-5"
      style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)" }}
    >
      <div style={{ borderBottom: "1px solid #EDE6DC" }} className="pb-4">
        <h2 className="text-base font-semibold" style={{ color: "#2D2D2D" }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: "#8B7261" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium" style={{ color: "#5A5A5A" }}>{label}</Label>
      {children}
    </div>
  )
}

// ── Copy Button ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
      style={{ backgroundColor: "#EDE6DC", color: "#C45A26", border: "1px solid #F5C4BC" }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy Migration SQL"}
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SettingsPageClient() {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  // ── Auth/Profile state ─────────────────────────────────────────────────────
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)

  // ── Brand state ────────────────────────────────────────────────────────────
  const [brand, setBrand] = useState<Brand | null>(null)
  const [brandName, setBrandName] = useState("")
  const [brandNiche, setBrandNiche] = useState("")
  const [brandTone, setBrandTone] = useState("")
  const [brandAudience, setBrandAudience] = useState("")
  const [savingBrand, setSavingBrand] = useState(false)
  const [creatingBrand, setCreatingBrand] = useState(false)

  // ── Social accounts state ──────────────────────────────────────────────────
  const [socialAccounts, setSocialAccounts] = useState<Record<string, SocialAccount>>({})
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  // Per-platform draft values for the followers/engagement inputs
  const [statsDraft, setStatsDraft] = useState<Record<string, { followers: string; engagement: string }>>({})
  const [savingStats, setSavingStats] = useState<string | null>(null)

  // ── Password state ─────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // ── DB status state ────────────────────────────────────────────────────────
  const [dbStatusOpen, setDbStatusOpen] = useState(false)
  const [dbStatus, setDbStatus] = useState<{
    ideasTable: boolean | null
    pillarsColumns: boolean | null
    checked: boolean
  }>({ ideasTable: null, pillarsColumns: null, checked: false })

  // ── Instagram Graph API state ──────────────────────────────────────────────
  const [igConnection, setIgConnection] = useState<{
    connected: boolean
    expiresAt: string | null
    username: string | null
  }>({ connected: false, expiresAt: null, username: null })
  const [disconnectingIg, setDisconnectingIg] = useState(false)

  // ── Danger zone state ──────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deletingContent, setDeletingContent] = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser ?? null)

    if (!authUser) { setLoading(false); return }

    const [{ data: profile }, { data: brands }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, social_accounts, instagram_access_token, instagram_token_expires_at")
        .eq("id", authUser.id)
        .single(),
      supabase.from("brands").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(1),
    ])

    setFullName(profile?.full_name ?? "")
    const normalized = normalizeSocialAccounts(
      (profile?.social_accounts ?? {}) as SocialAccountsMap | null,
    )
    setSocialAccounts(normalized)
    setIgConnection({
      connected: Boolean(profile?.instagram_access_token),
      expiresAt: (profile?.instagram_token_expires_at as string | null) ?? null,
      username: normalized.instagram?.handle ?? null,
    })
    setStatsDraft(
      Object.fromEntries(
        Object.entries(normalized).map(([platform, acct]) => [
          platform,
          {
            followers: acct.followers ? String(acct.followers) : "",
            engagement: acct.engagement ? String(acct.engagement) : "",
          },
        ]),
      ),
    )

    const primaryBrand = brands?.[0] ?? null
    setBrand(primaryBrand)
    if (primaryBrand) {
      setBrandName(primaryBrand.name ?? "")
      setBrandNiche(primaryBrand.niche ?? "")
      setBrandTone(primaryBrand.tone_of_voice ?? "")
      setBrandAudience(primaryBrand.target_audience ?? "")
    }

    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // ── Check DB status ────────────────────────────────────────────────────────
  const checkDbStatus = useCallback(async () => {
    if (dbStatus.checked) return
    try {
      // Check ideas table by querying it (if it errors, it doesn't exist)
      const { error: ideasErr } = await (supabase.from("ideas") as any).select("id").limit(1)
      const ideasOk = !ideasErr || ideasErr.code !== "42P01"

      // Check content_pillars columns by selecting them
      const { error: colErr } = await supabase
        .from("content_pillars")
        .select("voice_direction, format_preference, weekly_quota")
        .limit(1)
      const colsOk = !colErr || !colErr.message?.includes("voice_direction")

      setDbStatus({ ideasTable: ideasOk, pillarsColumns: colsOk, checked: true })
    } catch {
      setDbStatus({ ideasTable: null, pillarsColumns: null, checked: true })
    }
  }, [dbStatus.checked]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleDbStatus = () => {
    setDbStatusOpen((v) => {
      if (!v) checkDbStatus()
      return !v
    })
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setSavingProfile(true)
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
    if (error) {
      toast({ title: "Failed to save profile", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Profile saved ✓" })
    }
    setSavingProfile(false)
  }

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setSavingBrand(true)

    if (brand) {
      const { error } = await supabase
        .from("brands")
        .update({ name: brandName, niche: brandNiche, tone_of_voice: brandTone, target_audience: brandAudience })
        .eq("id", brand.id)
      if (error) {
        toast({ title: "Failed to save brand", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Brand saved ✓" })
        setBrand(prev => prev ? { ...prev, name: brandName, niche: brandNiche, tone_of_voice: brandTone, target_audience: brandAudience } : prev)
      }
    }
    setSavingBrand(false)
  }

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setCreatingBrand(true)

    const { data, error } = await supabase
      .from("brands")
      .insert({
        user_id: user.id,
        name: brandName,
        niche: brandNiche,
        tone_of_voice: brandTone || null,
        target_audience: brandAudience || null,
        primary_color: "#E06A33",
        secondary_color: "#C45A26",
      })
      .select()
      .single()

    if (error) {
      toast({ title: "Failed to create brand", description: error.message, variant: "destructive" })
    } else {
      setBrand(data as Brand)
      toast({ title: "Brand created ✓" })
    }
    setCreatingBrand(false)
  }

  const handleDisconnectSocial = async (platformId: string) => {
    if (!user?.id) return
    const meta = PLATFORM_META[platformId]
    const confirmed = window.confirm(`Disconnect ${meta?.name ?? platformId}? This will remove your saved handle.`)
    if (!confirmed) return
    setDisconnecting(platformId)
    const { [platformId]: _removed, ...updated } = socialAccounts
    const { error } = await supabase.from("profiles").update({ social_accounts: updated }).eq("id", user.id)
    if (error) {
      toast({ title: "Failed to disconnect", description: error.message, variant: "destructive" })
    } else {
      setSocialAccounts(updated)
      setStatsDraft((prev) => {
        const { [platformId]: _, ...rest } = prev
        return rest
      })
      toast({ title: "Account disconnected" })
    }
    setDisconnecting(null)
  }

  const handleSaveStats = async (platformId: string) => {
    const draft = statsDraft[platformId]
    if (!draft) return
    const followers = parseInt(draft.followers || "0", 10)
    const engagement = parseFloat(draft.engagement || "0")
    if (!Number.isFinite(followers) || followers < 0) {
      toast({ title: "Follower count must be a positive number", variant: "destructive" })
      return
    }
    if (!Number.isFinite(engagement) || engagement < 0 || engagement > 100) {
      toast({ title: "Engagement must be between 0 and 100", variant: "destructive" })
      return
    }
    setSavingStats(platformId)
    try {
      const result = await saveSocialStats(platformId, { followers, engagement })
      setSocialAccounts(result.accounts)
      toast({ title: `${PLATFORM_META[platformId]?.name ?? platformId} stats saved ✓` })
    } catch (err: unknown) {
      toast({
        title: "Failed to save stats",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSavingStats(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Password changed ✓" })
      setNewPassword("")
    }
    setChangingPassword(false)
  }

  const handleDeleteContent = async () => {
    if (deleteConfirm !== "DELETE" || !user?.id || !brand) return
    setDeletingContent(true)
    try {
      // Delete ideas for this brand
      await (supabase.from("ideas") as any).delete().eq("brand_id", brand.id)
      // Delete content pillars for this brand
      await supabase.from("content_pillars").delete().eq("brand_id", brand.id)
      toast({ title: "Content cleared", description: "All ideas and content pillars have been deleted." })
      setDeleteConfirm("")
    } catch (err: any) {
      toast({ title: "Failed to delete content", description: err.message, variant: "destructive" })
    }
    setDeletingContent(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleDisconnectInstagram = async () => {
    if (!user?.id) return
    const confirmed = window.confirm("Disconnect Instagram? Live stats will switch back to placeholder data.")
    if (!confirmed) return
    setDisconnectingIg(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await ((supabase as any)
      .from("profiles")
      .update({
        instagram_access_token: null,
        instagram_token_expires_at: null,
        instagram_user_id: null,
        instagram_page_id: null,
      })
      .eq("id", user.id))
    if (error) {
      toast({ title: "Failed to disconnect Instagram", description: error.message, variant: "destructive" })
    } else {
      setIgConnection({ connected: false, expiresAt: null, username: null })
      toast({ title: "Instagram disconnected" })
    }
    setDisconnectingIg(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const initials = getInitials(fullName || user?.email || "")
  const avatarBg = avatarColor(fullName || user?.email || "user")
  const connectedPlatforms = Object.entries(socialAccounts).filter(([, v]) => !!v)

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#EDE6DC" }}>
      {/* Page header */}
      <div className="px-4 pt-6 pb-5 md:px-8 md:pt-8 md:pb-6" style={{ borderBottom: "1px solid #C2B5A3" }}>
        <h1 className="text-2xl md:text-4xl font-semibold leading-tight" style={{ color: "#2D2D2D" }}>Settings</h1>
        <p className="mt-1.5 text-base" style={{ color: "#8B7261" }}>Manage your account, brand, and integrations</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-[#E06A33] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 w-full max-w-2xl px-4 py-6 md:px-8 md:py-10 space-y-8">

          {/* ── 1. Profile ──────────────────────────────────────────────── */}
          <SettingsSection title="Profile" subtitle="Your display name and account info">
            {/* Avatar preview */}
            <div className="flex items-center gap-4 mb-2">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0"
                style={{ backgroundColor: avatarBg }}
              >
                {initials}
              </div>
              <div>
                <p className="font-semibold" style={{ color: "#2D2D2D" }}>{fullName || "No name set"}</p>
                <p className="text-sm" style={{ color: "#8B7261" }}>{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <FieldRow label="Display Name">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 rounded-xl"
                />
              </FieldRow>
              <FieldRow label="Email">
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="rounded-xl"
                  style={{ backgroundColor: "#EDE6DC", color: "#8B7261", borderColor: "#C2B5A3" }}
                />
                <p className="text-xs mt-1" style={{ color: "#C2B5A3" }}>Email is managed through your login provider and cannot be changed here.</p>
              </FieldRow>
              <Button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl font-medium hover:opacity-90"
                style={{ backgroundColor: "#E06A33", color: "white" }}
              >
                {savingProfile ? "Saving…" : "Update Profile"}
              </Button>
            </form>

            {/* Password change */}
            <div style={{ borderTop: "1px solid #EDE6DC" }} className="pt-5 mt-2">
              <p className="text-sm font-semibold mb-3" style={{ color: "#2D2D2D" }}>Change Password</p>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <FieldRow label="New Password">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    className="border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 rounded-xl"
                  />
                </FieldRow>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={changingPassword || newPassword.length < 8}
                  className="rounded-xl"
                  style={{ borderColor: "#C2B5A3", color: "#5A5A5A" }}
                >
                  {changingPassword ? "Updating…" : "Change Password"}
                </Button>
              </form>
            </div>
          </SettingsSection>

          {/* ── 2. Brand ────────────────────────────────────────────────── */}
          <SettingsSection
            title="Brand"
            subtitle={brand ? "Your brand identity used across all content tools" : "Set up your brand to unlock all content tools"}
          >
            <form onSubmit={brand ? handleSaveBrand : handleCreateBrand} className="space-y-4">
              <FieldRow label="Brand Name">
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Kimmi Gayle Tattoos"
                  required
                  className="border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 rounded-xl"
                />
              </FieldRow>
              <FieldRow label="Niche">
                <Input
                  value={brandNiche}
                  onChange={(e) => setBrandNiche(e.target.value)}
                  placeholder="e.g. Fine line tattoo artist"
                  required
                  className="border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 rounded-xl"
                />
              </FieldRow>
              <FieldRow label="Tone of Voice">
                <Input
                  value={brandTone}
                  onChange={(e) => setBrandTone(e.target.value)}
                  placeholder="e.g. Warm, artistic, approachable"
                  className="border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 rounded-xl"
                  list="tone-options"
                />
                <datalist id="tone-options">
                  {TONES.map((t) => <option key={t} value={t} />)}
                </datalist>
              </FieldRow>
              <FieldRow label="Target Audience">
                <Textarea
                  value={brandAudience}
                  onChange={(e) => setBrandAudience(e.target.value)}
                  placeholder="e.g. Women aged 25–40 interested in minimalist tattoos"
                  rows={2}
                  className="border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 rounded-xl resize-none"
                />
              </FieldRow>
              <Button
                type="submit"
                disabled={savingBrand || creatingBrand || !brandName || !brandNiche}
                className="rounded-xl font-medium hover:opacity-90"
                style={{ backgroundColor: "#E06A33", color: "white" }}
              >
                {(savingBrand || creatingBrand) ? "Saving…" : brand ? "Save Brand" : "Create Brand →"}
              </Button>
            </form>
          </SettingsSection>

          {/* ── 3a. Connected Accounts (Instagram Graph API) ────────────── */}
          <SettingsSection
            title="Connected Accounts"
            subtitle="Connect your Instagram Business or Creator account to pull live follower count, reach, and recent post stats automatically."
          >
            <div
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{ backgroundColor: "#EDE6DC", border: "1px solid #C2B5A3" }}
            >
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-base shrink-0"
              >
                <span role="img" aria-label="Instagram">📸</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>Instagram</p>
                  {igConnection.connected ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}
                    >
                      ● Connected
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#FFFFFF", color: "#8B7261", border: "1px solid #C2B5A3" }}
                    >
                      Not connected
                    </span>
                  )}
                </div>
                {igConnection.connected ? (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8B7261" }}>
                    {igConnection.username ? `@${igConnection.username} · ` : ""}
                    Token expires{" "}
                    {igConnection.expiresAt
                      ? new Date(igConnection.expiresAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                    . Reconnect any time to refresh.
                  </p>
                ) : (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8B7261" }}>
                    Requires an Instagram Business or Creator account linked to a Facebook Page.
                  </p>
                )}
              </div>
              {igConnection.connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disconnectingIg}
                  onClick={handleDisconnectInstagram}
                  className="rounded-xl text-xs h-8 px-3 hover:bg-red-50 hover:text-red-600 shrink-0"
                  style={{ color: "#C2B5A3" }}
                >
                  {disconnectingIg ? "…" : "Disconnect"}
                </Button>
              ) : (
                <a
                  href="/api/auth/instagram"
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 h-8 rounded-xl shrink-0 hover:opacity-90"
                  style={{ backgroundColor: "#E06A33", color: "white" }}
                >
                  Connect <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </SettingsSection>

          {/* ── 3. Social Accounts ──────────────────────────────────────── */}
          <SettingsSection
            title="Social Accounts"
            subtitle="Add your follower count and engagement % so the dashboard can show real stats. We don't have API access to pull these automatically — enter them manually."
          >
            {connectedPlatforms.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm mb-3" style={{ color: "#8B7261" }}>No social accounts connected yet.</p>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    style={{ borderColor: "#C2B5A3", color: "#5A5A5A" }}
                  >
                    Connect accounts on Dashboard →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedPlatforms.map(([platformId, account]) => {
                  const meta = PLATFORM_META[platformId] ?? { emoji: "🌐", name: platformId, bg: "bg-slate-500" }
                  const draft = statsDraft[platformId] ?? { followers: "", engagement: "" }
                  const isSaving = savingStats === platformId
                  const currentFollowers = account.followers ?? 0
                  const currentEngagement = account.engagement ?? 0
                  const draftFollowers = parseInt(draft.followers || "0", 10) || 0
                  const draftEngagement = parseFloat(draft.engagement || "0") || 0
                  const hasUnsavedChanges =
                    draftFollowers !== currentFollowers || draftEngagement !== currentEngagement

                  return (
                    <div
                      key={platformId}
                      className="p-4 rounded-2xl space-y-3"
                      style={{ backgroundColor: "#EDE6DC", border: "1px solid #C2B5A3" }}
                    >
                      {/* Header row: icon + handle + disconnect */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${meta.bg} flex items-center justify-center text-sm shrink-0`}>
                          <span role="img" aria-label={meta.name}>{meta.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>{meta.name}</p>
                          <p className="text-xs truncate" style={{ color: "#E06A33" }}>{account.handle}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={disconnecting === platformId}
                          onClick={() => handleDisconnectSocial(platformId)}
                          className="rounded-xl text-xs h-7 px-3 hover:bg-red-50 hover:text-red-600"
                          style={{ color: "#C2B5A3" }}
                        >
                          {disconnecting === platformId ? "…" : "Disconnect"}
                        </Button>
                      </div>

                      {/* Stats inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium" style={{ color: "#8B7261" }}>
                            Followers
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            value={draft.followers}
                            onChange={(e) =>
                              setStatsDraft((prev) => ({
                                ...prev,
                                [platformId]: { ...draft, followers: e.target.value },
                              }))
                            }
                            placeholder="e.g. 12400"
                            className="h-9 rounded-xl border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium" style={{ color: "#8B7261" }}>
                            Avg Engagement %
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            inputMode="decimal"
                            value={draft.engagement}
                            onChange={(e) =>
                              setStatsDraft((prev) => ({
                                ...prev,
                                [platformId]: { ...draft, engagement: e.target.value },
                              }))
                            }
                            placeholder="e.g. 4.2"
                            className="h-9 rounded-xl border-[#C2B5A3] focus-visible:ring-[#E06A33]/50 bg-white"
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={isSaving || !hasUnsavedChanges}
                          onClick={() => handleSaveStats(platformId)}
                          className="rounded-xl text-xs h-9 px-4 hover:opacity-90 disabled:opacity-50"
                          style={{
                            backgroundColor: hasUnsavedChanges ? "#E06A33" : "#C2B5A3",
                            color: hasUnsavedChanges ? "white" : "#8B7261",
                          }}
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-1">
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: "#E06A33" }}
                  >
                    + Connect more accounts →
                  </Link>
                </div>
              </div>
            )}
          </SettingsSection>

          {/* ── 4. API & Integrations ────────────────────────────────────── */}
          <SettingsSection title="API & Integrations" subtitle="Your connected tools and services">
            {/* Anthropic */}
            <div className="space-y-3">
              <div
                className="flex items-start gap-4 p-4 rounded-2xl"
                style={{ backgroundColor: "#EDE6DC", border: "1px solid #C2B5A3" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 font-bold"
                  style={{ backgroundColor: "#2D2D2D", color: "#FFFFFF" }}
                >
                  ◆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>Anthropic (Claude AI)</p>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}
                    >
                      ● Active
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8B7261" }}>
                    API key is configured via your Vercel environment variables. To update it, go to your{" "}
                    <a
                      href="https://vercel.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-70"
                      style={{ color: "#E06A33" }}
                    >
                      Vercel project settings
                    </a>
                    {" "}→ Environment Variables → update <code className="text-xs bg-[#EDE6DC] px-1 rounded">ANTHROPIC_API_KEY</code>.
                  </p>
                </div>
              </div>

              {/* Canva */}
              <div
                className="flex items-start gap-4 p-4 rounded-2xl"
                style={{ backgroundColor: "#EDE6DC", border: "1px solid #C2B5A3" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: "#7C3AED", color: "white" }}
                >
                  ✨
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>Canva</p>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#F5F3FF", color: "#6D28D9", border: "1px solid #DDD6FE" }}
                    >
                      ● Connected
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8B7261" }}>
                    Connected via URL integration — no additional setup needed. Use the ✨ Canva buttons in Content Creator to open your designs directly.
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* ── 5. Database Status ───────────────────────────────────────── */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)" }}
          >
            <button
              type="button"
              onClick={handleToggleDbStatus}
              className="w-full flex items-center justify-between p-6 transition-colors hover:bg-[#EDE6DC]"
            >
              <div className="text-left">
                <p className="text-base font-semibold" style={{ color: "#2D2D2D" }}>Database Status</p>
                <p className="text-sm mt-0.5" style={{ color: "#8B7261" }}>Migration health check for developers</p>
              </div>
              {dbStatusOpen
                ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "#8B7261" }} />
                : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "#8B7261" }} />
              }
            </button>

            {dbStatusOpen && (
              <div className="px-6 pb-6 space-y-4" style={{ borderTop: "1px solid #EDE6DC" }}>
                <div className="pt-4 space-y-3">
                  <StatusRow
                    label="ideas table"
                    description="Stores saved content ideas from Content Creator"
                    ok={dbStatus.ideasTable}
                  />
                  <StatusRow
                    label="content_pillars — new columns"
                    description="voice_direction, format_preference, weekly_quota"
                    ok={dbStatus.pillarsColumns}
                  />
                </div>

                {(dbStatus.ideasTable === false || dbStatus.pillarsColumns === false) && (
                  <div
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: "#FFFBEA", border: "1px solid #F5DFA0" }}
                  >
                    <p className="text-xs font-semibold mb-2" style={{ color: "#8B5E10" }}>
                      ⚠️ Run this SQL in your Supabase Dashboard → SQL Editor
                    </p>
                    <pre
                      className="text-xs overflow-auto p-3 rounded-xl leading-relaxed"
                      style={{ backgroundColor: "#FFF8E6", color: "#5A5A5A", maxHeight: "200px" }}
                    >
                      {MIGRATION_SQL}
                    </pre>
                    <div className="mt-3 flex items-center gap-3">
                      <CopyButton text={MIGRATION_SQL} />
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium hover:opacity-70"
                        style={{ color: "#E06A33" }}
                      >
                        Open Supabase <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {dbStatus.ideasTable === true && dbStatus.pillarsColumns === true && (
                  <p className="text-sm font-medium" style={{ color: "#16A34A" }}>
                    ✓ All migrations applied — database is up to date
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── 6. Danger Zone ──────────────────────────────────────────── */}
          <div
            className="rounded-3xl p-6 space-y-5"
            style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(180, 100, 60, 0.09)", border: "1px solid #EDE6DC" }}
          >
            <div style={{ borderBottom: "1px solid #EDE6DC" }} className="pb-4">
              <h2 className="text-base font-semibold" style={{ color: "#C45A26" }}>Danger Zone</h2>
              <p className="text-sm mt-0.5" style={{ color: "#8B7261" }}>Irreversible actions — proceed with care</p>
            </div>

            {/* Delete content */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>Delete all my content</p>
                <p className="text-xs mt-0.5" style={{ color: "#8B7261" }}>
                  Permanently deletes all ideas and content pillars for your brand. Your brand profile is kept.
                </p>
              </div>
              {!brand ? (
                <p className="text-xs" style={{ color: "#C2B5A3" }}>No brand set up — nothing to delete.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder='Type "DELETE" to confirm'
                    className="rounded-xl border-red-200 focus-visible:ring-red-300 max-w-[200px]"
                    style={{ fontSize: "13px" }}
                  />
                  <Button
                    onClick={handleDeleteContent}
                    disabled={deleteConfirm !== "DELETE" || deletingContent}
                    size="sm"
                    className="rounded-xl text-xs font-medium"
                    style={{
                      backgroundColor: deleteConfirm === "DELETE" ? "#DC2626" : "#F3F4F6",
                      color: deleteConfirm === "DELETE" ? "white" : "#9CA3AF",
                    }}
                  >
                    {deletingContent ? "Deleting…" : "Delete Content"}
                  </Button>
                </div>
              )}
            </div>

            {/* Delete account */}
            <div style={{ borderTop: "1px solid #EDE6DC" }} className="pt-5 space-y-2">
              <p className="text-sm font-semibold" style={{ color: "#2D2D2D" }}>Delete Account</p>
              <p className="text-xs" style={{ color: "#8B7261" }}>
                To permanently delete your account and all associated data, please email us at{" "}
                <a href="mailto:support@brandflow.app" className="underline hover:opacity-70" style={{ color: "#E06A33" }}>
                  support@brandflow.app
                </a>
                {" "}with the subject line "Delete my account". We&apos;ll process your request within 48 hours.
              </p>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="rounded-xl mt-2"
                style={{ borderColor: "#C2B5A3", color: "#5A5A5A" }}
              >
                Sign Out First
              </Button>
            </div>
          </div>

          {/* Beta plan card */}
          <div
            className="rounded-3xl p-5 flex items-center justify-between"
            style={{ backgroundColor: "#EDE6DC", border: "1px solid #F5C4BC" }}
          >
            <div>
              <p className="font-semibold" style={{ color: "#2D2D2D" }}>Free Plan — Beta</p>
              <p className="text-sm mt-0.5" style={{ color: "#8B7261" }}>
                Unlimited brands and posts during our beta period. 🎉
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
              style={{ backgroundColor: "#E06A33", color: "white" }}
            >
              Beta
            </span>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Status Row ─────────────────────────────────────────────────────────────────

function StatusRow({
  label,
  description,
  ok,
}: {
  label: string
  description: string
  ok: boolean | null
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {ok === null ? (
          <div className="h-4 w-4 rounded-full border-2 border-[#C2B5A3] border-t-[#8B7261] animate-spin" />
        ) : ok ? (
          <div
            className="h-4 w-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#F0FDF4" }}
          >
            <Check className="h-2.5 w-2.5" style={{ color: "#16A34A" }} />
          </div>
        ) : (
          <div
            className="h-4 w-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#FFFBEA" }}
          >
            <AlertTriangle className="h-2.5 w-2.5" style={{ color: "#D97706" }} />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: "#2D2D2D" }}>
          <code className="text-xs bg-[#EDE6DC] px-1.5 py-0.5 rounded-lg">{label}</code>
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#8B7261" }}>{description}</p>
      </div>
    </div>
  )
}
