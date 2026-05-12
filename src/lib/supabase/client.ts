import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

// @supabase/ssr 0.3 ships a stale generic signature that mis-positions Schema
// into the SchemaName slot of the newer SupabaseClient, which collapses table
// types to `never`. We cast through unknown to the correctly-parameterised
// SupabaseClient<Database> so .from('profiles') etc. infer real Row types.
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>
}
