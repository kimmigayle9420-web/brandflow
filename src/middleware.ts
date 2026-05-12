import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const val = request.cookies.get(name)?.value
          if (val) return val
          // fallback: combineChunks asks for key.0 but browser stores bare key
          if (name.endsWith('.0')) return request.cookies.get(name.slice(0, -2))?.value
          return undefined
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options } as any)
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options } as any)
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options } as any)
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options } as any)
        },
      },
    }
  )

  // getUser() validates the JWT against Supabase servers — getSession() only
  // reads the cookie which stays valid even for deleted accounts, causing loops.
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const protectedRoutes = [
    '/dashboard', '/brands', '/content-pillars', '/content-planner',
    '/niche-research', '/settings', '/onboarding', '/calendar', '/content-creator',
    '/content-research',
  ]
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
