import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types'

// See lib/supabase/client.ts for the cast rationale.
export function createClient(): SupabaseClient<Database> {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const val = cookieStore.get(name)?.value
          if (val) return val
          // fallback: combineChunks asks for key.0 but browser stores bare key
          if (name.endsWith('.0')) return cookieStore.get(name.slice(0, -2))?.value
          return undefined
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  ) as unknown as SupabaseClient<Database>
}
