import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchPageText } from "../research-profile/route"

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === "placeholder-key" || apiKey.trim() === "") {
    const isProduction = process.env.NODE_ENV === "production"
    const msg = isProduction
      ? "Anthropic API key is not configured. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy."
      : "Anthropic API key is not configured. Please check your environment variables."
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let niche: string, targetAudience: string, tone: string, socialUrls: string[]
  try {
    const body = await request.json()
    niche = (body.niche ?? "").trim()
    targetAudience = (body.targetAudience ?? "").trim()
    tone = (body.tone ?? "").trim()
    socialUrls = Array.isArray(body.socialUrls) ? body.socialUrls.filter(Boolean) : []
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!niche) {
    return NextResponse.json({ error: "Brand niche is required" }, { status: 400 })
  }

  // Fetch page content for each social URL (up to 3 to keep latency manageable)
  const urlsToFetch = socialUrls.slice(0, 3)
  const profileTexts: string[] = []
  await Promise.all(
    urlsToFetch.map(async (url) => {
      const text = await fetchPageText(url)
      if (text && text !== "(Page content could not be fetched — analyse from URL only)") {
        profileTexts.push(`[${url}]\n${text}`)
      } else {
        profileTexts.push(`[${url}]\n(Profile not publicly accessible — use URL context only)`)
      }
    })
  )

  const profileContext = profileTexts.length > 0
    ? `\n\nSocial profile data:\n${profileTexts.join("\n\n---\n\n")}`
    : "\n\nNo social profiles connected yet."

  const brandContext = [
    `Niche: ${niche}`,
    targetAudience ? `Target audience: ${targetAudience}` : null,
    tone ? `Brand tone: ${tone}` : null,
  ].filter(Boolean).join("\n")

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
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `You are a world-class content strategist for social media creators. Based on this creator's brand and social presence, give them a personalised content opportunity analysis.

Brand info:
${brandContext}
${profileContext}

Your job: identify what content they should be making RIGHT NOW to grow. What are their audience's unmet needs? What formats are working in this niche? What are their competitors doing that they're not?

Return a JSON object with these exact keys:
- "contentGaps": array of exactly 4 short strings (6-10 words each) — specific content topics or angles that are underserved in this niche right now
- "topOpportunities": array of exactly 3 objects, each with:
  - "angle": a compelling content angle or series idea (8-12 words, punchy and specific)
  - "why": 1 sentence explaining why this will resonate with their audience right now
  - "format": exactly one of "Reel", "Carousel", or "Post"
- "audienceInsights": 2-3 sentence paragraph describing what the audience actually wants, their frustrations, and what makes them engage
- "suggestedPillars": array of exactly 4 short strings (2-4 words each) — content pillar suggestions tailored to this niche and audience

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
    console.error("[research-opportunity] Error:", error?.message ?? error)
    if (error?.status === 401) {
      const isProduction = process.env.NODE_ENV === "production"
      const msg = isProduction
        ? "Invalid Anthropic API key. Update ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables and redeploy."
        : "Invalid Anthropic API key. Please check your environment variables."
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    return NextResponse.json(
      { error: "Research failed: " + (error?.message ?? String(error)) },
      { status: 500 }
    )
  }
}
