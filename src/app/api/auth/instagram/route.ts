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
    console.error("[instagram/initiate] NEXT_PUBLIC_INSTAGRAM_APP_ID is not set")
    return NextResponse.redirect(`${baseUrl}/dashboard?error=instagram_not_configured`)
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    // instagram_manage_insights is required for reach, profile_views, and
    // views metrics on the account-level insights endpoint.
    scope: "pages_show_list,pages_read_engagement,business_management,instagram_basic,instagram_manage_insights",
  })

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`,
  )
}
