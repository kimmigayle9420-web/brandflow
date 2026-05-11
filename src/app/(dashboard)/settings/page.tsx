"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ?? null)
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single()
        setFullName(profile?.full_name ?? "")
        setAvatarUrl(profile?.avatar_url ?? "")
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, avatar_url: avatarUrl || null })
      .eq("id", user!.id!)

    if (error) {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Profile updated!" })
    }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Password changed successfully!" })
      setCurrentPassword("")
      setNewPassword("")
    }
    setChangingPassword(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b bg-white px-8 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex-1 px-8 py-6 max-w-2xl space-y-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            {/* Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Update your name and avatar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl">
                      {getInitials(fullName || user?.email ?? "")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-800">{fullName || "No name set"}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/your-photo.jpg"
                    />
                    <p className="text-xs text-slate-400">Paste a URL to an image for your profile picture.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email ?? ""} disabled className="bg-slate-50" />
                    <p className="text-xs text-slate-400">Email cannot be changed here. Contact support if needed.</p>
                  </div>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                    {saving ? "Saving…" : "Save Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Choose a strong, unique password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={changingPassword || newPassword.length < 8}
                  >
                    {changingPassword ? "Updating…" : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Session and account management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Sign out</p>
                    <p className="text-xs text-slate-500">Sign out of this device</p>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-red-600">Delete Account</p>
                    <p className="text-xs text-slate-500">Permanently delete your account and all data. Irreversible.</p>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Plan info */}
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-indigo-900">Free Plan</p>
                    <p className="text-sm text-indigo-600 mt-0.5">Unlimited brands and posts during beta.</p>
                  </div>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">Beta</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
