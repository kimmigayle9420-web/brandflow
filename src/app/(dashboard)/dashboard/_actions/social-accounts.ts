"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { normalizeSocialAccounts } from "@/lib/social-accounts"
import type { SocialAccount, SocialAccountsMap } from "@/types"

type ActionResult = {
  success: true
  accounts: Record<string, SocialAccount>
}

async function loadCurrent(): Promise<{
  userId: string
  current: Record<string, SocialAccount>
  supabase: ReturnType<typeof createClient>
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("social_accounts")
    .eq("id", user.id)
    .single()

  if (error) throw new Error(error.message)

  const current = normalizeSocialAccounts(
    (profile?.social_accounts ?? {}) as SocialAccountsMap | null,
  )
  return { userId: user.id, current, supabase }
}

async function persist(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accounts: Record<string, SocialAccount>,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ social_accounts: accounts })
    .eq("id", userId)
  if (error) throw new Error(error.message)
}

export async function saveSocialHandle(
  platform: string,
  handle: string,
): Promise<ActionResult> {
  const trimmed = handle.trim()
  if (!trimmed) throw new Error("Handle cannot be empty")

  const { userId, current, supabase } = await loadCurrent()
  const existing = current[platform]
  const updated: Record<string, SocialAccount> = {
    ...current,
    [platform]: {
      platform,
      handle: trimmed,
      followers: existing?.followers ?? 0,
      engagement: existing?.engagement ?? 0,
      url: existing?.url,
    },
  }

  await persist(supabase, userId, updated)
  revalidatePath("/dashboard")
  revalidatePath("/settings")
  return { success: true, accounts: updated }
}

export async function removeSocialHandle(
  platform: string,
): Promise<ActionResult> {
  const { userId, current, supabase } = await loadCurrent()
  const { [platform]: _removed, ...updated } = current

  await persist(supabase, userId, updated)
  revalidatePath("/dashboard")
  revalidatePath("/settings")
  return { success: true, accounts: updated }
}

export async function saveSocialStats(
  platform: string,
  stats: { followers: number; engagement: number },
): Promise<ActionResult> {
  const { userId, current, supabase } = await loadCurrent()
  const existing = current[platform]
  if (!existing) throw new Error("Connect this platform before adding stats")

  const followers = Math.max(0, Math.round(stats.followers || 0))
  const engagement = Math.max(0, Math.min(100, Number(stats.engagement) || 0))

  const updated: Record<string, SocialAccount> = {
    ...current,
    [platform]: { ...existing, followers, engagement },
  }

  await persist(supabase, userId, updated)
  revalidatePath("/dashboard")
  revalidatePath("/settings")
  return { success: true, accounts: updated }
}
