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
      { error: 'Anthropic API key is not configured. Please check your environment variables.' },
      { status: 500 }
    )
  }

  let body: {
    brandName?: string
    niche?: string
    tone?: string
    targetAudience?: string
    pillars?: Array<{
      id: string
      name: string
      voice_direction?: string | null
      format_preference?: string | null
      weekly_quota?: number | null
    }>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { brandName, niche, tone, targetAudience, pillars = [] } = body

  if (!pillars.length) {
    return NextResponse.json({ error: 'No pillars provided' }, { status: 400 })
  }

  // Build pillar list for prompt
  const pillarList = pillars.map((p, i) =>
    `${i + 1}. ${p.name}${p.voice_direction ? ` (voice: ${p.voice_direction})` : ''}${p.format_preference && p.format_preference !== 'any' ? ` (preferred format: ${p.format_preference})` : ''}${p.weekly_quota ? ` (quota: ${p.weekly_quota}x/week)` : ''}`
  ).join('\n')

  // Distribute 7 slots proportionally by weekly_quota, defaulting to 2
  const totalQuota = pillars.reduce((sum, p) => sum + (p.weekly_quota ?? 2), 0)
  const slots: string[] = []
  for (const p of pillars) {
    const count = Math.max(1, Math.round(((p.weekly_quota ?? 2) / totalQuota) * 7))
    for (let i = 0; i < count && slots.length < 7; i++) {
      slots.push(p.id)
    }
  }
  // Fill remaining slots round-robin
  let idx = 0
  while (slots.length < 7) {
    slots.push(pillars[idx % pillars.length].id)
    idx++
  }
  // Shuffle slightly (interleave pillars rather than cluster)
  const shuffled = slots.sort(() => Math.random() - 0.4)

  const slotDescriptions = shuffled.map((pillarId, i) => {
    const p = pillars.find(p => p.id === pillarId)
    return `Day ${i + 1} (${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}): pillar_id="${pillarId}" pillar_name="${p?.name ?? 'Unknown'}"`
  }).join('\n')

  const prompt = `You are an expert social media content strategist for ${brandName || 'a brand'}.

Brand context:
- Niche: ${niche || 'general'}
- Tone: ${tone || 'conversational, authentic'}
- Target audience: ${targetAudience || 'general audience'}

Content pillars:
${pillarList}

Generate a week of content (7 days, Mon–Sun). For each day, create one content idea that fits the assigned pillar.

Assigned slots:
${slotDescriptions}

For each slot, return:
- A scroll-stopping hook (1–2 lines, specific and curiosity-driven)
- A brief content angle (what the post is actually about, 1 sentence)
- The best format: "Post", "Carousel", or "Reel"

Return ONLY valid JSON array. No explanation, no markdown.
[
  {
    "pillar_id": "...",
    "day": "Mon",
    "suggestedHook": "...",
    "suggestedAngle": "...",
    "suggestedFormat": "Post|Carousel|Reel"
  }
]`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return NextResponse.json({ error: err.error?.message ?? 'Anthropic API error' }, { status: 500 })
  }

  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content?.[0]?.text ?? '[]'

  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(cleaned)
    return NextResponse.json({ weekIdeas: Array.isArray(result) ? result : [] })
  } catch {
    return NextResponse.json({ error: 'Failed to parse week ideas response', raw: text }, { status: 500 })
  }
}
