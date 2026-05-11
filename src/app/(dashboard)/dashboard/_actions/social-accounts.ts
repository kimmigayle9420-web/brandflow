"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveSocialHandle(
  platform: string,
  handle: string
): Promise<{ success: true; accounts: Record<string, string> }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const trimmed = handle.trim()
  if (!trimmed) throw new Error("Handle cannot be empty")

  // Fetch current social_accounts
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("social_accounts")
    .eq("id", user.id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const current = (profile?.social_accounts as Record<string, string>) ?? {}
  const updated = { ...current, [platform]: trimmed }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ social_accounts: updated })
    .eq("id", user.id)

  if (updateError) throw new Error(updateError.message)

  revalidatePath("/dashboard")

  return { success: true, accounts: updated }
}

export async function removeSocialHandle(
  platform: string
): Promise<{ success: true; accounts: Record<string, string> }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("social_accounts")
    .eq("id", user.id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const current = (profile?.social_accounts as Record<string, string>) ?? {}
  const { [platform]: _, ...updated } = current

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ social_accounts: updated })
    .eq("id", user.id)

  if (updateError) throw new Error(updateError.message)

  revalidatePath("/dashboard")

  return { success: true, accounts: updated }
}
