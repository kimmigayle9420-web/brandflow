import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export async function POST(request: Request) {
  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse body
  let niche: string
  try {
    const body = await request.json()
    niche = body.niche
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!niche || typeof niche !== "string" || !niche.trim()) {
    return NextResponse.json({ error: "Niche is required" }, { status: 400 })
  }

  // Generate pillars with Anthropic
  try {
    const client = new Anthropic()

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `Generate exactly 5 content pillars for a "${niche.trim()}" brand on social media.

Return a valid JSON array with exactly 5 objects. Each object MUST have these exact keys:
- "name": short, memorable pillar name (2–4 words, title case)
- "description": one clear sentence explaining what content belongs under this pillar
- "emoji": a single relevant emoji character
- "examples": array of exactly 3 brief post idea examples (each 6–12 words)

Return ONLY the raw JSON array. No markdown, no code fences, no explanation, no extra text.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI")
    }

    // Strip any accidental markdown code fences
    const cleaned = content.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")

    const pillars = JSON.parse(cleaned)

    if (!Array.isArray(pillars) || pillars.length === 0) {
      throw new Error("Invalid pillars format returned")
    }

    return NextResponse.json({ pillars })
  } catch (error) {
    console.error("[generate-pillars] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate content pillars. Please try again." },
      { status: 500 }
    )
  }
}
