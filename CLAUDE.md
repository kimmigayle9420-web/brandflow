# BrandFlow — Project Context for Claude

## What this project is
BrandFlow is a Next.js 14 SaaS app for content creators to manage their brand strategy, content pillars, ideas bank, and content calendar. Built by Kimmi Gayle (tattoo artist + founder). Live at https://brandflow-roan.vercel.app

## Active Skill: Social Media Marketing
**Always apply the `social-media-marketing` skill when working on any feature related to:**
- Content pillars, ideas bank, content planner, or calendar
- Hook generation, caption writing, or content briefs
- Platform strategy (Instagram, TikTok, YouTube, etc.)
- The onboarding flow or brand setup wizard
- Any AI-generated content recommendations inside the app

The social-media-marketing skill is the Content Empire Operator — it defines how BrandFlow thinks about content strategy. All product decisions for content features should align with it.

## Tech stack
- **Framework:** Next.js 14 App Router (TypeScript)
- **Auth + DB:** Supabase (SSR — always use `getUser()` server-side, never `getSession()`)
- **Deployment:** Vercel
- **Styling:** Tailwind CSS

## Database (Supabase)
Project ref: `qshxmbzskpdpxksvkeja`
Tables: `profiles`, `brands`, `content_pillars`, `ideas`, `posts`
RLS is enabled on all tables — users can only see/edit their own rows.

Key schema notes:
- `ideas` table uses `content_type` (legacy) and `format` (new) — prefer `format`
- `ideas.hashtags` is `text[]`
- `content_pillars` has: name, emoji, description, color, sort_order, voice_direction, format_preference, weekly_quota
- `ideas.status`: 'idea' | 'draft' | 'scheduled' | 'posted'

## Kimmi's brand (live data)
- Brand ID: `70cad3ce-699d-4fb8-bb9c-dd2bf082c0fc`
- User ID: `7cbccbc1-0877-447b-938d-a59f7c9eef18`
- 5 content pillars: Portfolio, Process, Education, Culture, Conversion
- 20 ideas in the ideas bank across all pillars

## Content Empire Framework (built into BrandFlow)
Pillar mix for a colour realism tattoo artist:
- Portfolio 35% — finished work, healed shots, detail close-ups
- Process 25% — in-progress video, stencil to finish, colour mixing
- Education 20% — colour realism technique, aftercare, how to brief
- Culture 15% — life as an artist, behind the scenes, client stories
- Conversion 5% — booking opens, flash days, gift vouchers

Posting cadence: Instagram 5x/week, TikTok 1x/day, Pinterest 10x/week

## Env vars
See `.env.local` — never commit. Vercel env vars must be set manually for production.

## Key rules
- Never hardcode user data — always fetch from Supabase with `getUser()`
- All server components use `createServerClient` from `@supabase/ssr`
- All client components use `createBrowserClient`
- Git push via Desktop Commander (not bash sandbox) if lock file errors occur
