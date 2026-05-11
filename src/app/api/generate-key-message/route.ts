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
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 }
    )
  }

  let body: {
    topic?: string
    pillarName?: string
    pillarVoiceDirection?: string
    brandName?: string
    niche?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { topic, pillarName, pillarVoiceDirection, brandName, niche } = body

  const prompt = `You are a social media strategist helping a creator define the core takeaway for a post.

Context:
- Brand: ${brandName || 'Personal brand'}
- Niche: ${niche || 'general'}
${pillarName ? `- Content pillar: ${pillarName}` : ''}
${pillarVoiceDirection ? `- Voice direction: ${pillarVoiceDirection}` : ''}
- Topic / angle: ${topic || 'general content'}

Write ONE short, punchy key message (1–2 sentences max) that captures:
- The single most important thing the audience should take away from this post
- Written in the first person or second person (not "the creator should…")
- Specific and actionable — not generic

Examples of good key messages:
- "You don't need a perfect morning routine — you just need one that you'll actually do."
- "Healing your relationship with food starts before the meal, not during it."
- "Most people fail at consistency because they aim too high too fast."

Return ONLY a JSON object (no fences, no explanation):
{"keyMessage": "your suggested key message here"}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
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
    return NextResponse.json({ keyMessage: text.replace(/[{}"keyMessage:]/g, '').trim() })
  }
}
