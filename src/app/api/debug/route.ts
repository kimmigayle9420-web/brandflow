import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll()
  const sbCookies = allCookies.filter(c => c.name.includes('sb-'))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    cookie_count: allCookies.length,
    sb_cookie_names: sbCookies.map(c => c.name),
    sb_cookie_value_length: sbCookies[0]?.value?.length ?? 0,
    sb_cookie_starts_with: sbCookies[0]?.value?.substring(0, 10) ?? 'none',
    has_session: !!session,
    user_email: session?.user?.email ?? null,
  })
}
