import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchPageText } from "@/lib/page-fetcher"

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

  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
  const extractedText = await fetchPageText(normalizedUrl)

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
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a content strategy expert. Analyse this social media profile or website and give a content creator actionable intelligence they can use to improve their own content strategy.

URL: ${normalizedUrl}
Content: ${extractedText}

Return a JSON object with these exact keys:
- "contentStrategy": 1-2 sentences describing what content is working for this account and why
- "postingPatterns": 1 sentence describing their posting frequency, timing, and format mix
- "hookStyles": array of 3-4 short strings describing hook styles they use (e.g. "Controversial takes", "Personal story openers")
- "topicClusters": array of 4-5 short strings of the main topic clusters they own
- "toneAndVoice": 1 sentence describing their tone, voice, and personality
- "whatToSteal": array of exactly 3 short actionable strings — specific tactics or ideas a competitor could adopt (start with a verb, e.g. "Use before/after transformations", "Post behind-the-scenes process content")
- "gaps": array of 2-3 short strings describing what this account is NOT doing that represents an opportunity

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
        : "Invalid Anthropic API key. Please check your environment variables."
      return NextResponse.json({ error: msg }, { status: 503 })
    }
    return NextResponse.json(
      { error: "Analysis failed: " + (error?.message ?? String(error)) },
      { status: 500 }
    )
  }
}
