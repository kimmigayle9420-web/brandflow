import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = "claude-haiku-4-5-20251001"

export type GenerationType =
  | "caption"
  | "hashtags"
  | "post_ideas"
  | "niche_framework"
  | "format_content"

export interface GenerateRequest {
  type: GenerationType
  // Brand context
  brandName?: string
  niche?: string
  toneOfVoice?: string
  targetAudience?: string
  // Content context
  pillarName?: string
  pillarDescription?: string
  platform?: string
  captionDraft?: string
  format?: string
  // Niche research
  nicheInput?: string
}

export interface GenerateResponse {
  result: string
  error?: string
}

// ── Helper: build a consistent brand context block ──────────────────────────
function brandContext(req: GenerateRequest): string {
  const parts: string[] = []
  if (req.brandName) parts.push(`Brand: ${req.brandName}`)
  if (req.niche) parts.push(`Niche: ${req.niche}`)
  if (req.toneOfVoice) parts.push(`Tone of voice: ${req.toneOfVoice}`)
  if (req.targetAudience) parts.push(`Target audience: ${req.targetAudience}`)
  if (req.pillarName) parts.push(`Content pillar: ${req.pillarName}${req.pillarDescription ? ` — ${req.pillarDescription}` : ""}`)
  if (req.platform) parts.push(`Platform: ${req.platform}`)
  return parts.join("\n")
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function captionPrompt(req: GenerateRequest): string {
  return `You are an expert social media copywriter. Write a compelling, on-brand caption for a social media post.

${brandContext(req)}

Requirements:
- Match the brand's tone of voice exactly
- Write for the specified platform (length, style, emoji usage should feel native)
- Focus on the content pillar theme
- Include a strong hook in the first line
- End with a clear call to action or engaging question
- Do NOT include hashtags in the caption (those come separately)
- Output ONLY the caption text, nothing else — no labels, no explanation

Write the caption now:`
}

function hashtagsPrompt(req: GenerateRequest): string {
  return `You are a social media strategist specialising in hashtag strategy.

${brandContext(req)}

${req.captionDraft ? `Caption: ${req.captionDraft}` : ""}

Generate a hashtag strategy for this post. Return EXACTLY this format — nothing else:

BROAD (high volume, 3 tags):
#tag1 #tag2 #tag3

NICHE (medium volume, 3 tags):
#tag4 #tag5 #tag6

BRANDED/SPECIFIC (low volume, 2 tags):
#tag7 #tag8

Only output the formatted hashtag clusters above. No explanation.`
}

function postIdeasPrompt(req: GenerateRequest): string {
  const pillarsText = req.pillarName ? `Content pillars to cover: ${req.pillarName}` : ""
  return `You are a creative social media content strategist.

${brandContext(req)}
${pillarsText}

Generate 6 specific, creative post ideas for this brand. Each idea should:
- Be tied to the brand's niche and tone
- Feel fresh and engaging for the target audience
- Include the content format (e.g. Carousel, Reel, Static, Story)
- Be actionable and specific — not generic advice

Return EXACTLY this format — one idea per line, no extra text:

1. [Format] Title — One sentence describing what the post covers and why it resonates
2. [Format] Title — One sentence describing what the post covers and why it resonates
3. [Format] Title — One sentence describing what the post covers and why it resonates
4. [Format] Title — One sentence describing what the post covers and why it resonates
5. [Format] Title — One sentence describing what the post covers and why it resonates
6. [Format] Title — One sentence describing what the post covers and why it resonates

Output ONLY the numbered list. No preamble.`
}

function formatContentPrompt(req: GenerateRequest): string {
  const format = req.format ?? "static"
  const ctx = brandContext(req)

  if (format === "carousel") {
    return `You are an expert social media content strategist. Create a carousel post content plan.

${ctx}

Return a JSON object with EXACTLY this structure (raw JSON, no markdown fences):

{
  "format": "carousel",
  "hookSlide": {
    "title": "Attention-grabbing hook slide title (max 8 words)",
    "subtitle": "Optional one-line supporting text"
  },
  "slides": [
    { "number": 1, "title": "Slide title (max 6 words)", "keyPoint": "The main point or takeaway for this slide" },
    { "number": 2, "title": "Slide title (max 6 words)", "keyPoint": "The main point or takeaway for this slide" },
    { "number": 3, "title": "Slide title (max 6 words)", "keyPoint": "The main point or takeaway for this slide" },
    { "number": 4, "title": "Slide title (max 6 words)", "keyPoint": "The main point or takeaway for this slide" }
  ],
  "ctaSlide": {
    "headline": "CTA slide headline",
    "action": "Specific call-to-action (e.g. Save this post, Follow for more, DM us X)"
  },
  "hookOptions": [
    "Hook caption option 1 — short punchy opening line for the caption",
    "Hook caption option 2 — different angle, same topic",
    "Hook caption option 3 — question or curiosity gap style"
  ]
}

Rules:
- Slides should flow logically (problem → solution, or step-by-step, or myth-busting)
- Hook slide must stop the scroll immediately
- CTA must be specific and relevant to this brand/niche
- Hook options are for the caption text, not the slide itself
- Output ONLY the raw JSON — no explanation`
  }

  if (format === "reel") {
    return `You are an expert short-form video content strategist. Create a Reel script plan.

${ctx}

Return a JSON object with EXACTLY this structure (raw JSON, no markdown fences):

{
  "format": "reel",
  "hook": "The first 3 seconds — exactly what to say or show to stop the scroll",
  "scenes": [
    { "number": 1, "point": "What to say or show in this scene", "duration": "~X seconds" },
    { "number": 2, "point": "What to say or show in this scene", "duration": "~X seconds" },
    { "number": 3, "point": "What to say or show in this scene", "duration": "~X seconds" }
  ],
  "cta": "Closing call-to-action — what to say at the end of the video",
  "captionHookOptions": [
    "Hook caption option 1 — punchy first line for the Reel caption",
    "Hook caption option 2 — different angle",
    "Hook caption option 3 — curiosity or question style"
  ]
}

Rules:
- Hook must be immediate — no slow intros
- Scenes should build on each other naturally
- Total reel should feel like 15–30 seconds of tight content
- Caption hooks are separate from the video script — they're for the post caption
- Output ONLY the raw JSON — no explanation`
  }

  if (format === "story") {
    return `You are an expert Instagram Stories content strategist. Create a Story sequence plan.

${ctx}

Return a JSON object with EXACTLY this structure (raw JSON, no markdown fences):

{
  "format": "story",
  "frames": [
    {
      "number": 1,
      "visualIdea": "What to show or design on this frame",
      "textOverlay": "Text to overlay on the frame (short, punchy)",
      "action": "Optional: any tap/swipe prompt or interactive element"
    },
    {
      "number": 2,
      "visualIdea": "What to show or design on this frame",
      "textOverlay": "Text to overlay on the frame",
      "action": "Optional action"
    },
    {
      "number": 3,
      "visualIdea": "What to show or design on this frame",
      "textOverlay": "Text to overlay on the frame",
      "action": "Optional action"
    },
    {
      "number": 4,
      "visualIdea": "What to show or design on this frame",
      "textOverlay": "Text to overlay on the frame",
      "action": "Optional action"
    }
  ],
  "engagementPrompt": {
    "type": "poll or question sticker",
    "content": "The actual poll question or question sticker text",
    "options": ["Option A", "Option B"]
  },
  "captionHookOptions": [
    "Hook option 1 for the story link/caption",
    "Hook option 2",
    "Hook option 3"
  ]
}

Rules:
- Frames should tell a mini-story or journey — not random slides
- Text overlays must be very short (max 8 words)
- Engagement prompt should feel natural and on-brand
- Output ONLY the raw JSON — no explanation`
  }

  // static — return caption + hashtags together
  return `You are an expert social media copywriter and strategist.

${ctx}

Generate both a caption and hashtag strategy for this static post.

Return a JSON object with EXACTLY this structure (raw JSON, no markdown fences):

{
  "format": "static",
  "caption": "Full on-brand caption with hook, body, and CTA. No hashtags.",
  "hashtags": {
    "broad": ["#tag1", "#tag2", "#tag3"],
    "niche": ["#tag4", "#tag5", "#tag6"],
    "specific": ["#tag7", "#tag8"]
  },
  "captionHookOptions": [
    "Alternative hook line option 1",
    "Alternative hook line option 2",
    "Alternative hook line option 3"
  ]
}

Rules:
- Caption must match the brand's tone exactly
- Hashtags at different volume levels (broad = high volume, specific = low volume)
- Hook options are alternative first lines only, not full captions
- Output ONLY the raw JSON — no explanation`
}

function nicheFrameworkPrompt(niche: string): string {
  return `You are a brand strategist and social media expert. Generate a comprehensive content framework for this niche.

Niche: ${niche}

Return a JSON object with EXACTLY this structure (no markdown, no code fences, pure JSON):

{
  "niche": "refined niche description",
  "coreProblem": "the core problem this niche solves in 1-2 sentences",
  "targetPersona": {
    "name": "persona name (first name + descriptive word, e.g. 'Busy Beth')",
    "age": "age range e.g. '25–40'",
    "pain": "their main pain point in one sentence",
    "desire": "their core desire in one sentence"
  },
  "contentPillars": ["Pillar 1", "Pillar 2", "Pillar 3", "Pillar 4", "Pillar 5"],
  "contentFormats": ["format 1", "format 2", "format 3", "format 4", "format 5"],
  "keyMessages": ["message 1", "message 2", "message 3", "message 4"],
  "hashtagClusters": [
    ["#tag1", "#tag2", "#tag3", "#tag4"],
    ["#tag5", "#tag6", "#tag7", "#tag8"],
    ["#tag9", "#tag10", "#tag11", "#tag12"]
  ],
  "platforms": ["Platform 1", "Platform 2", "Platform 3"],
  "postingFrequency": "specific posting cadence recommendation"
}

Rules:
- Be specific to this exact niche — not generic advice
- Pillar names should be short (2–4 words)
- Content formats should be concrete and platform-native
- Key messages should be punchy one-liners that could be captions
- Hashtags should be real, relevant tags at different volume levels
- Output ONLY the raw JSON object — no explanation, no markdown`
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Auth check — only logged-in users can use AI generation
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Anthropic API key is not configured. Please check your environment variables." },
      { status: 500 }
    )
  }

  let body: GenerateRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { type } = body

  let prompt: string
  switch (type) {
    case "caption":
      prompt = captionPrompt(body)
      break
    case "hashtags":
      prompt = hashtagsPrompt(body)
      break
    case "post_ideas":
      prompt = postIdeasPrompt(body)
      break
    case "niche_framework":
      if (!body.nicheInput) {
        return NextResponse.json({ error: "nicheInput is required for niche_framework" }, { status: 400 })
      }
      prompt = nicheFrameworkPrompt(body.nicheInput)
      break
    case "format_content":
      prompt = formatContentPrompt(body)
      break
    default:
      return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: (type === "niche_framework" || type === "format_content") ? 1500 : 800,
      messages: [{ role: "user", content: prompt }],
    })

    const result = message.content[0].type === "text" ? message.content[0].text : ""
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Anthropic API error:", message)
    return NextResponse.json({ error: `AI generation failed: ${message}` }, { status: 500 })
  }
}
