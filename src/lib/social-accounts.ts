import type { SocialAccount, SocialAccountsMap } from "@/types"

// Normalize one entry — handles legacy rows where the value was a bare handle string.
export function normalizeSocialAccount(
  platform: string,
  value: SocialAccount | string | null | undefined,
): SocialAccount | null {
  if (!value) return null
  if (typeof value === "string") {
    const handle = value.trim()
    if (!handle) return null
    return { platform, handle, followers: 0, engagement: 0 }
  }
  const handle = (value.handle ?? "").trim()
  if (!handle) return null
  return {
    platform: value.platform ?? platform,
    handle,
    followers: Number.isFinite(value.followers) ? Number(value.followers) : 0,
    engagement: Number.isFinite(value.engagement) ? Number(value.engagement) : 0,
    url: value.url,
  }
}

export function normalizeSocialAccounts(
  raw: SocialAccountsMap | null | undefined,
): Record<string, SocialAccount> {
  if (!raw) return {}
  const out: Record<string, SocialAccount> = {}
  for (const [platform, value] of Object.entries(raw)) {
    const norm = normalizeSocialAccount(platform, value)
    if (norm) out[platform] = norm
  }
  return out
}

// Adapter for callers that still consume a flat platformId -> handle map
// (content-creator components, profile-URL helpers, etc).
export function toHandleMap(
  accounts: Record<string, SocialAccount>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(accounts)) out[k] = v.handle
  return out
}
