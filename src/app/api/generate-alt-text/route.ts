import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

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

  let body: { imageDescription?: string; brandName?: string; niche?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { imageDescription, brandName, niche } = body

  if (!imageDescription?.trim()) {
    return NextResponse.json({ error: 'imageDescription is required' }, { status: 400 })
  }

  const prompt = `You are an accessibility expert writing alt text for social media images.

Image description from creator: "${imageDescription}"
${brandName ? `Brand: ${brandName}` : ''}
${niche ? `Niche: ${niche}` : ''}

Write accessible alt text for this Instagram image that:
- Describes the visual content clearly and concisely (1–2 sentences max)
- Conveys relevant context: subjects, setting, mood, any visible text
- Does NOT begin with "Image of" or "Photo of" (screen readers announce this automatically)
- Stays under 125 characters (Instagram's recommended alt text length)
- Focuses on what's visually meaningful — not brand promotion
- Is written for someone who cannot see the image at all

Return ONLY a JSON object (no fences, no explanation):
{"altText": "your accessible alt text here"}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
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
    // Fallback: strip JSON artifacts and return raw text
    const altText = text.replace(/[{}"]/g, '').replace(/altText\s*:\s*/i, '').trim()
    return NextResponse.json({ altText })
  }
}
