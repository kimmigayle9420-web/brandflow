import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const NBP_EXAMPLE = `REFERENCE (Nano Banana Pro — fitness & wellness for busy professionals):
Concept: "Why your morning routine isn't working"
Duration: 30s

Example output:
{
  "hook": "POV: you finally stopped overcomplicating your wellness routine",
  "scenes": [
    {"timestamp": "0:00–0:03", "description": "Quick cut: phone showing 15 wellness apps open. Your face looks overwhelmed."},
    {"timestamp": "0:03–0:10", "description": "VO: 'I used to spend more time planning my wellness routine than actually doing it'"},
    {"timestamp": "0:10–0:22", "description": "Montage: ONE simple habit done daily — glass of water, 5-min stretch, 2 mins outside"},
    {"timestamp": "0:22–0:30", "description": "Text overlay: '30 days later → more energy, less guilt'. Hold on calm smile to camera."}
  ],
  "voiceover": "The secret to a sustainable routine? Pick ONE thing. Do it every day for 30 days. That's literally it. Stop trying to become a different person overnight — just start with one small win.",
  "audioMood": "Upbeat Lo-Fi or soft motivational pop — think 'good morning energy' without being overwhelming. Try: Montell Fish, Surfaces, or trending Lo-Fi beats.",
  "cta": "Follow for daily wellness tips that actually fit your real life (not your Pinterest board)"
}`

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
    concept?: string
    duration?: string
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

  const { concept, duration = '30s', brandName, niche, tone, targetAudience, pillarName, pillarVoiceDirection, pillarFormatPreference } = body

  const sceneCount = duration === '15s' ? 3 : duration === '30s' ? 4 : duration === '60s' ? 6 : 8
  const voiceoverLength = duration === '15s' ? '25–40' : duration === '30s' ? '50–70' : duration === '60s' ? '90–120' : '150–200'

  const pillarContext = pillarName ? `
Content Pillar: ${pillarName}
${pillarVoiceDirection ? `Voice direction: ${pillarVoiceDirection}` : ''}
${pillarFormatPreference && pillarFormatPreference !== 'any' ? `Preferred format: ${pillarFormatPreference}` : ''}` : ''

  const prompt = `You are an expert short-form video content strategist for Instagram Reels and TikTok.

Brand context:
- Name: ${brandName || 'Personal brand'}
- Niche: ${niche || 'general'}
- Tone: ${tone || 'conversational, relatable'}
- Target audience: ${targetAudience || 'general audience'}
- Reel concept: ${concept || 'general content'}
- Duration: ${duration}
${pillarContext}

${NBP_EXAMPLE}

Create a complete ${duration} Reel script for this concept. Requirements:

HOOK (0:00–0:03): The exact first 3 seconds. Must immediately create curiosity or emotion. Can be a POV, bold statement, relatable moment, or unexpected visual.

SCENES (${sceneCount} total): Each scene has a timestamp + specific description of what to film and/or say. Be concrete and visual — not vague.

VOICEOVER (~${voiceoverLength} words): A cohesive spoken script for the whole reel. Should feel natural, not scripted. Match the brand's tone exactly.${pillarVoiceDirection ? ` Voice direction for this pillar: ${pillarVoiceDirection}.` : ''}

AUDIO MOOD: Specific genre + vibe + example artist/song if possible.

CTA: What to say and show in the final 2 seconds. Make it specific (not just "follow me").

Return ONLY a valid JSON object — no markdown fences, no explanation:
{
  "hook": "...",
  "scenes": [
    {"timestamp": "...", "description": "..."},
    ...${sceneCount} scenes total...
  ],
  "voiceover": "...",
  "audioMood": "...",
  "cta": "..."
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
      max_tokens: 1400,
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
    return NextResponse.json({ error: 'Failed to parse reel script', raw: text }, { status: 500 })
  }
}
