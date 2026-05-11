import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  // Guard: API key must be configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === "placeholder-key" || apiKey.trim() === "") {
    const isProduction = process.env.NODE_ENV === "production"
    const msg = isProduction
      ? "Anthropic API key is not configured. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy."
      : "Anthropic API key is not configured. Please check your environment variables."
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
  let topic: string
  try {
    const body = await request.json()
    topic = (body.topic ?? "").trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 })
  }

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
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are a social media content strategist. Research this niche/topic for a content creator: "${topic}"

Return a JSON object with these exact keys:
- "contentAngles": array of exactly 5 objects, each with "angle" (title, 4-8 words) and "rationale" (1 sentence why it works)
- "painPoints": array of exactly 5 strings describing audience pain points (each 8-15 words)
- "trendingTopics": array of exactly 5 strings of trending topics right now in this niche (each 4-8 words)
- "postingFormats": array of exactly 4 objects, each with "format" (e.g. "Short-Form Video / Reels"), "reasoning" (1 sentence), and "priority" ("high" | "medium" | "low")
- "contentGaps": array of exactly 4 strings describing underserved content opportunities competitors are missing (each 8-15 words)

Return ONLY raw JSON, no markdown fences, no extra text.`,
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
    console.error("[research-niche] Error:", error?.message ?? error)

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
