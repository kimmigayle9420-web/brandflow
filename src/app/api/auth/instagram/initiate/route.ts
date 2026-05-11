import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ setup: true })
  }

  // Build the redirect URI — works on Vercel and locally
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user_profile,user_media",
    response_type: "code",
  })

  const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`

  return NextResponse.json({ url: authUrl })
}
