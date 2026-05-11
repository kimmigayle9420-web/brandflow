import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractMetaContent(html: string, nameOrProperty: string): string {
  // Matches <meta name="..." content="..."> or <meta property="..." content="...">
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${nameOrProperty}["'][^>]+content=["']([^"']*)["']`,
    "i"
  )
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${nameOrProperty}["']`,
    "i"
  )
  return html.match(re)?.[1] ?? html.match(re2)?.[1] ?? ""
}

export async function POST(request: Request) {
  // Guard: API key must be configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === "placeholder-key" || apiKey.trim() === "") {
    const isProduction = process.env.NODE_ENV === "production"
    const msg = isProduction
      ? "Anthropic API key is not configured. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy."
      : "Anthropic API key is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server."
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse body
  let url: string
  try {
    const body = await request.json()
    url = (body.url ?? "").trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  // Normalise URL
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`

  // Attempt to fetch page content
  let extractedText = ""
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BrandFlow/1.0; +https://brandflow.app) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const html = await res.text()
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? ""
      const description = extractMetaContent(html, "description")
      const ogTitle = extractMetaContent(html, "og:title")
      const ogDesc = extractMetaContent(html, "og:description")
      const ogType = extractMetaContent(html, "og:type")
      const bodyText = stripHtml(html).slice(0, 2500)

      extractedText = [title, ogTitle, ogType, description, ogDesc, bodyText]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 3000)
    }
  } catch {
    // Fall back to analysing from the URL string alone
    extractedText = "(Page content could not be fetched — analyse from URL only)"
  }

  // Send to Claude Haiku for brand intelligence extraction
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Analyse this social media profile or website content and extract brand intelligence.

URL: ${normalizedUrl}
Content: ${extractedText}

Return a JSON object with:
- "niche": the primary niche/industry (2-4 words)
- "contentThemes": array of 4-6 content theme tags
- "postingStyle": brief description of their content style (1 sentence)
- "targetAudience": who they seem to target (1 sentence)
- "topTopics": array of 4-5 specific topics they cover
- "brandVoice": tone description (e.g. "Educational and motivational", "Casual and relatable")

Return ONLY raw JSON, no markdown.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw Object.assign(new Error(errText), { status: response.status })
    }

    const result = await response.json()
    const content = result.content?.[0]
    if (!content || content.type !== "text") throw new Error("Unexpected response format")

    const cleaned = (content as { type: string; text: string }).text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")

    const data = JSON.parse(cleaned)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[research-profile] Error:", error?.message ?? error)

    if (error?.status === 401) {
      const isProduction = process.env.NODE_ENV === "production"
      const msg = isProduction
        ? "Invalid Anthropic API key. Update ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables and redeploy."
        : "Invalid Anthropic API key. Check ANTHROPIC_API_KEY in .env.local."
      return NextResponse.json({ error: msg }, { status: 503 })
    }

    return NextResponse.json(
      { error: "Analysis failed: " + (error?.message ?? String(error)) },
      { status: 500 }
    )
  }
}
