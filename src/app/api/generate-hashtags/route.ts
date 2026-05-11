import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const NBP_EXAMPLE = `REFERENCE (Nano Banana Pro — fitness & wellness for busy professionals):
Example output:
{
  "niche": ["#busyprofessionalwellness", "#worklifebalancecoach", "#healthyhabitsforbusy", "#wellnessforprofessionals", "#morningroutinecoach", "#energyboosttips"],
  "broad": ["#wellnessjourney", "#healthylifestyle", "#selfcare", "#mindfulnessmatters", "#fitnessmotivation", "#healthymindset"],
  "engagement": ["#savethispost", "#sharethis", "#wellnesstips", "#realselfcare", "#dailywellness", "#fyp"]
}
Total: 18 hashtags (6 per group)`

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

  let body: { niche?: string; caption?: string; brandName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { niche, caption, brandName } = body

  const prompt = `You are a hashtag strategy expert who knows which tags drive real reach and saves on Instagram.

Brand: ${brandName || 'Personal brand'}
Niche: ${niche || 'general'}
${caption ? `Caption context: ${caption.substring(0, 300)}` : ''}

${NBP_EXAMPLE}

Generate exactly 18 hashtags (6 per group) tailored to this brand and content.

Group definitions:
- NICHE: Very specific to this exact niche. Targeted community, medium-low competition (under 300k posts ideal). These bring the most qualified followers.
- BROAD: Widely used in the broader industry. High reach potential (500k–5M posts). Balance discoverability with relevance.
- ENGAGEMENT: Action-oriented discovery tags. Mix of trending ("fyp", "viral") and save-driven ("savethispost", "screenshotthistip") and real talk ("realtalk", "honesttruths") style.

Rules:
- All tags must be real and active on Instagram
- No completely generic tags (#instagood, #photooftheday, #followme)
- Mix compound words and short phrases naturally
- Tags must relate to the brand's actual niche and content

Return ONLY this JSON (no fences, no explanation):
{"niche": ["#tag",...], "broad": ["#tag",...], "engagement": ["#tag",...]}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
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
    return NextResponse.json({ error: 'Failed to parse hashtags', raw: text }, { status: 500 })
  }
}
