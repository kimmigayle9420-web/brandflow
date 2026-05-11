import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const NBP_EXAMPLES = `REFERENCE BRAND — Nano Banana Pro (fitness & wellness for busy professionals):
Hook examples from this brand:
• "The 5-minute morning routine that changed my entire day (no, it's not cold showers)"
• "Nobody tells you this about energy levels — and it's not about coffee ☕"
• "I spent 3 years overcomplicating my wellness routine. Here's what actually stuck."
• "POV: you finally stopped letting perfect be the enemy of done (wellness edition)"
• "The thing nobody tells you when you start prioritising your health (it's not the gym)"

Use this quality bar — match the specificity, relatability, and scroll-stopping nature. Then adapt for the user's brand and topic.`

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
    topic?: string
    keyMessage?: string
    brandName?: string
    niche?: string
    tone?: string
    targetAudience?: string
    pillarName?: string
    pillarVoiceDirection?: string
    pillarFormatPreference?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    topic, keyMessage, brandName, niche, tone, targetAudience,
    pillarName, pillarVoiceDirection, pillarFormatPreference,
  } = body

  const pillarContext = pillarName ? `
Content Pillar: ${pillarName}
${pillarVoiceDirection ? `Voice direction: ${pillarVoiceDirection}` : ''}
${pillarFormatPreference && pillarFormatPreference !== 'any' ? `Preferred format: ${pillarFormatPreference}` : ''}` : ''

  const prompt = `You are an expert social media copywriter specialising in scroll-stopping hooks for Instagram and TikTok.

Brand context:
- Name: ${brandName || 'Personal brand'}
- Niche: ${niche || 'general'}
- Tone: ${tone || 'conversational, authentic'}
- Target audience: ${targetAudience || 'general audience'}
- Topic / angle: ${topic || 'general content'}
${keyMessage ? `- Key message to convey: ${keyMessage}` : ''}
${pillarContext}

${NBP_EXAMPLES}

Generate exactly 3 scroll-stopping hooks for the topic/angle above. Each hook must:
- Stop the scroll in the first 3–5 words
- Be specific to the brand's niche (not generic platitudes)
- Create curiosity, relatability, or a bold claim
- Be 1–2 lines maximum
- Vary in style: (1) curiosity-gap or "nobody talks about this", (2) POV / relatable situation, (3) bold or contrarian claim / before-after transformation
${pillarVoiceDirection ? `- Match this voice direction: ${pillarVoiceDirection}` : ''}

Also recommend the single best content format for this topic+pillar combination.

Return ONLY a valid JSON object. Nothing else. No explanation, no numbering outside the object.
{
  "hooks": ["Hook 1", "Hook 2", "Hook 3"],
  "formatRecommendation": {
    "format": "Post",
    "reasoning": "One sentence explaining why this format works best for this topic"
  }
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
      max_tokens: 600,
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
    // Backwards compat: also expose hooks at top level array
    return NextResponse.json({
      hooks: result.hooks ?? [],
      formatRecommendation: result.formatRecommendation ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse hooks response', raw: text }, { status: 500 })
  }
}
