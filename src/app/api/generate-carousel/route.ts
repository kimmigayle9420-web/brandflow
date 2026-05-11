import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const NBP_EXAMPLE = `REFERENCE (Nano Banana Pro — fitness & wellness for busy professionals):
Topic: "5 signs your body is screaming for a reset"
Slide count: 5

Example output:
{
  "slides": [
    {"id": 1, "type": "cover", "title": "5 Signs Your Body Needs a Reset", "hook": "You've been ignoring these signals all year 👇"},
    {"id": 2, "type": "content", "title": "Sign #1: The 3pm Energy Crash", "bullets": ["Coffee stopped working weeks ago", "You're reaching for sugar by midday", "Energy's gone long before dinner"]},
    {"id": 3, "type": "content", "title": "Sign #2: Bloating Every Single Day", "bullets": ["Heavy and uncomfortable after meals", "Clothes feel tight by 3pm", "Your digestion has felt off for months"]},
    {"id": 4, "type": "content", "title": "Sign #3: You Can't Switch Off", "bullets": ["Still wired and alert at midnight", "Waking up between 2–4am", "Racing thoughts won't quiet down"]},
    {"id": 5, "type": "cta", "title": "Ready for a Real Reset?", "cta": "Save this post — I'm dropping the full 5-day reset plan next week. Follow so you don't miss it."}
  ]
}`

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.length < 20) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
    )
  }

  let body: { topic?: string; slideCount?: number; brandName?: string; niche?: string; tone?: string; targetAudience?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { topic, slideCount = 5, brandName, niche, tone, targetAudience } = body
  const clampedCount = Math.min(10, Math.max(3, slideCount))
  const contentSlideCount = clampedCount - 2 // minus cover + CTA

  const prompt = `You are an expert carousel content strategist for Instagram and LinkedIn.

Brand context:
- Name: ${brandName || 'Personal brand'}
- Niche: ${niche || 'general'}
- Tone: ${tone || 'conversational, authoritative'}
- Target audience: ${targetAudience || 'general audience'}
- Carousel topic: ${topic || 'general content'}
- Total slides requested: ${clampedCount}

${NBP_EXAMPLE}

Create a ${clampedCount}-slide carousel on the topic above. Exact structure:
- Slide 1 (cover): Bold title (max 8 words) + a hook subtitle that creates immediate curiosity or stakes
- Slides 2 to ${clampedCount - 1} (content, ${contentSlideCount} slides): Each has a title (max 7 words) + exactly 3 bullet points (punchy, specific, 6–10 words each)
- Slide ${clampedCount} (cta): Short punchy headline + a specific CTA that drives saves, follows, or DMs

Quality rules:
- Every slide must be value-dense and specific to this niche — no generic advice
- Bullet points should be concrete, specific insights — not vague ("eat better" is bad; "cut seed oils for 2 weeks first" is good)
- Content must flow logically: problem → insight → solution → action
- CTA must tell them exactly what to do and why right now

Return ONLY a valid JSON object — no markdown fences, no explanation:
{
  "slides": [
    {"id": 1, "type": "cover", "title": "...", "hook": "..."},
    {"id": 2, "type": "content", "title": "...", "bullets": ["...", "...", "..."]},
    ...more content slides...
    {"id": ${clampedCount}, "type": "cta", "title": "...", "cta": "..."}
  ]
}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return NextResponse.json({ error: err.error?.message ?? 'Anthropic API error' }, { status: 500 })
  }

  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content?.[0]?.text ?? '{}'

  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(cleaned)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse carousel outline', raw: text }, { status: 500 })
  }
}
