import { NextResponse } from "next/server"

// Kicks off Meta's Facebook Login dialog. Meta returns to /api/auth/instagram/callback,
// which exchanges the code for a long-lived token and discovers the user's IG Business Account.
export async function GET(request: Request) {
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin)

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`

  if (!appId) {
    return NextResponse.redirect(`${baseUrl}/settings?error=instagram_not_configured`)
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement",
  })

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`,
  )
}
