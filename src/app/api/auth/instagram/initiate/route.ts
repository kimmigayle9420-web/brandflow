import { NextResponse } from "next/server"
import { INSTAGRAM_OAUTH_SCOPE } from "@/lib/instagram-scope"

// JSON variant of /api/auth/instagram — used by the signup page so it can
// gracefully toast "not configured" instead of redirecting to an error page.
export async function GET(request: Request) {
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID

  if (!appId) {
    return NextResponse.json({ setup: true })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin)

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_OAUTH_SCOPE,
    // Carry origin so the callback knows to return to onboarding Step 2.
    state: "onboarding",
  })

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`

  return NextResponse.json({ url: authUrl })
}
