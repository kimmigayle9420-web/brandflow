/*
 * SQL — Run in Supabase SQL editor to support the full pillar schema:
 * ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS voice_direction text;
 * ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS format_preference text DEFAULT 'any';
 * ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS weekly_quota int DEFAULT 2;
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  // Guard: ensure API key is actually configured
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === "placeholder-key" || apiKey.trim() === "") {
    const isProduction = process.env.NODE_ENV === "production"
    const errorMsg = isProduction
      ? "Anthropic API key is not configured. Add ANTHROPIC_API_KEY in your Vercel project → Settings → Environment Variables, then redeploy."
      : "Anthropic API key is not configured. Add ANTHROPIC_API_KEY=<your-key> to .env.local and restart the dev server."
    return NextResponse.json({ error: errorMsg }, { status: 503 })
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1800,
        messages: [
          {
            role: 'user',
            content: `You are generating content pillars for a personal brand creator in the "${niche.trim()}" niche.

Each pillar is a creative lens — a specific perspective and voice through which the creator talks about their niche. Make each pillar DISTINCT in voice, angle, and format. No two pillars should sound the same.

Generate exactly 5 content pillars. Return a valid JSON array with exactly 5 objects. Each object MUST have these exact keys:

- "name": short, memorable pillar name (2–4 words, title case)
- "emoji": a single relevant emoji character
- "description": one clear sentence explaining what content belongs under this pillar
- "perspective": the specific raw angle or lens for this pillar — what unique POV the creator brings (e.g. "The raw reality of creating custom art that clients never see", "The messy, unfiltered truth about running a solo business")
- "voice_direction": the tone and style direction for this pillar (e.g. "Intimate, honest, slightly vulnerable — lead with emotion, close with insight")
- "format_preference": single string — one of "post", "carousel", "reel", or "any" — which format works best for this pillar's content type
- "postIdeas": array of exactly 3 brief post idea examples (each 6–12 words)
- "weekly_quota": integer between 1 and 3 — how many times per week to post under this pillar (vary across pillars to total ~7–9 per week)

Return ONLY the raw JSON array. No markdown, no code fences, no explanation, no extra text.`,
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
    if (!content || content.type !== 'text') throw new Error('Unexpected response format')

    // Strip any accidental markdown code fences
    const cleaned = (content as { type: string; text: string }).text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")

    const pillars = JSON.parse(cleaned)

    if (!Array.isArray(pillars) || pillars.length === 0) {
      throw new Error("Invalid pillars format returned")
    }

    // Normalise: ensure all fields exist
    const VALID_FORMATS = ["post", "carousel", "reel", "any"]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalised = pillars.map((p: any) => ({
      name: p.name ?? "Untitled",
      emoji: p.emoji ?? "📌",
      description: p.description ?? "",
      perspective: p.perspective ?? p.description ?? "",
      postIdeas: p.postIdeas ?? p.examples ?? [],
      voice_direction: p.voice_direction ?? p.voiceDirection ?? null,
      format_preference: VALID_FORMATS.includes(p.format_preference ?? p.formatPreference ?? "")
        ? (p.format_preference ?? p.formatPreference)
        : "any",
      weekly_quota: typeof p.weekly_quota === "number"
        ? Math.min(5, Math.max(1, p.weekly_quota))
        : 2,
    }))

    return NextResponse.json({ pillars: normalised })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[generate-pillars] Error:", error?.message ?? error, "status:", error?.status)

    // Surface auth errors clearly
    if (error?.status === 401) {
      const isProduction = process.env.NODE_ENV === "production"
      const authMsg = isProduction
        ? "Invalid Anthropic API key. Update ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables and redeploy."
        : "Invalid Anthropic API key. Check your ANTHROPIC_API_KEY in .env.local."
      return NextResponse.json({ error: authMsg }, { status: 503 })
    }

    return NextResponse.json(
      { error: "ERR: " + (error?.message ?? String(error)), errStatus: error?.status },
      { status: 500 }
    )
  }
}
