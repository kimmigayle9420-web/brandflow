import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const NBP_EXAMPLE = `REFERENCE (Nano Banana Pro — fitness & wellness for busy professionals):
Hook used: "Healing your relationship with food starts with this mindset shift 🍌"

Example caption output:
"Nobody talks about this, but healing your relationship with food starts with *this* mindset shift. 🍌

The problem isn't willpower. It's the story you tell yourself at 3pm when you're exhausted and reaching for whatever's closest.

Here's what actually changed things for me:
↳ I stopped labelling food as 'good' or 'bad'
↳ I started asking 'what does my body actually need right now?'
↳ I gave myself permission to just... eat

The result? Less guilt. More energy. A relationship with food that doesn't require a 47-step plan.

Sound familiar? Drop a 🍌 in the comments if you've been fighting this battle too."

---
Match this depth, voice, and emotional resonance — but adapt for the user's brand.`

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
    hook?: string
    topic?: string
    notes?: string
    brandName?: string
    niche?: string
    tone?: string
    targetAudience?: string
    pillarName?: string
    pillarDescription?: string
    pillarVoiceDirection?: string
    pillarFormatPreference?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { hook, topic, notes, brandName, niche, tone, targetAudience, pillarName, pillarDescription, pillarVoiceDirection, pillarFormatPreference } = body

  const pillarContext = pillarName ? `
Content Pillar: ${pillarName}
${pillarDescription ? `Pillar description / POV: ${pillarDescription}` : ''}
${pillarVoiceDirection ? `Voice direction: ${pillarVoiceDirection}` : ''}
${pillarFormatPreference && pillarFormatPreference !== 'any' ? `Preferred format: ${pillarFormatPreference}` : ''}` : ''

  const prompt = `You are an expert social media caption writer who creates scroll-stopping, on-brand content.

Brand context:
- Name: ${brandName || 'Personal brand'}
- Niche: ${niche || 'general'}
- Tone: ${tone || 'conversational, authentic'}
- Target audience: ${targetAudience || 'general audience'}
${topic ? `- Topic / angle: ${topic}` : ''}
- Hook to open with: ${hook || 'general content hook'}
${notes ? `- Additional context / notes: ${notes}` : ''}
${pillarContext}

${NBP_EXAMPLE}

Write a full Instagram caption that:
1. Opens with the hook provided (or a polished version of it)
2. Delivers genuine value — insight, story, practical tip, or relatable experience
3. Uses line breaks and white space for easy reading
4. Ends with a strong, specific CTA (not generic "follow me for more")
5. Matches the brand's exact tone of voice${pillarVoiceDirection ? ` — specifically: ${pillarVoiceDirection}` : ''}
6. Runs 150–300 words (substantial but not overwhelming)
7. Uses 1–3 relevant emojis woven naturally (not one at the end of every line)
8. Does NOT include hashtags (those come separately)

Return ONLY a JSON object — no fences, no explanation:
{"caption": "full caption text here"}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
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
    // Fallback: return raw text as caption
    return NextResponse.json({ caption: text.trim() })
  }
}
