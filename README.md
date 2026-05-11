# BrandFlow

A multi-tenant social media brand management and content planning SaaS built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Auth** — Sign up, login, logout via Supabase Auth
- **Brand Profiles** — Create and manage brand identities with niche, target audience, tone of voice, and brand colours
- **Content Pillars** — Define 3–6 content themes per brand
- **Content Planner** — Plan and track posts by platform, date, status, and pillar (list + calendar views)
- **AI Caption Generator** — Generate on-brand captions for any post using Claude, informed by your brand's tone, niche, and content pillar
- **AI Hashtag Generator** — Generate niche-specific hashtag clusters for each post
- **AI Post Ideas** — Generate 6 tailored post ideas based on your brand and pillars
- **Niche Research** — Enter any niche and Claude generates a complete framework: target persona, content pillars, formats, key messages, hashtag clusters, and platform strategy
- **Settings** — Account profile management
- **Multi-tenancy** — All data is isolated per user via Supabase Row Level Security (RLS)

---

## Setup Instructions

### 1. Clone or extract the project

```bash
cd brandflow
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to fully provision

### 3. Run the database schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Paste the entire contents into the SQL Editor and click **Run**

This creates:
- `profiles` table (auto-populated on signup)
- `brands` table
- `content_pillars` table
- `posts` table
- Row Level Security (RLS) policies for all tables
- Triggers to auto-create profiles and update `updated_at` timestamps

### 4. Configure environment variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials from **Project Settings → API** and your Anthropic API key:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   **Getting your Anthropic API key:**
   1. Go to [console.anthropic.com](https://console.anthropic.com)
   2. Sign up or log in
   3. Navigate to **API Keys** and create a new key
   4. Paste the key into your `.env.local` as `ANTHROPIC_API_KEY`

   > The AI features (caption generation, post ideas, niche research) require this key. The rest of the app works fine without it.

### 5. Configure Supabase Auth

In your Supabase dashboard, go to **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (change to your production URL when deploying)
- **Redirect URLs**: Add `http://localhost:3000/api/auth/callback`

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Deploying to Vercel

1. Push your project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add the following **Environment Variables** in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → set to your Vercel deployment URL (e.g. `https://brandflow.vercel.app`)
4. Deploy!

After deploying, update your Supabase Auth settings:
- **Site URL**: your Vercel URL
- **Redirect URLs**: add `https://your-vercel-url.vercel.app/api/auth/callback`

---

## Project Structure

```
brandflow/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login & signup pages
│   │   ├── (dashboard)/      # All protected dashboard pages
│   │   │   ├── dashboard/
│   │   │   ├── brands/
│   │   │   ├── content-pillars/
│   │   │   ├── content-planner/
│   │   │   ├── niche-research/
│   │   │   └── settings/
│   │   └── api/auth/callback/ # Supabase auth callback
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── layout/           # Sidebar + Header
│   │   └── brands/           # Brand form component
│   ├── lib/
│   │   ├── supabase/         # Client + server Supabase instances
│   │   └── utils.ts          # Helpers, constants
│   ├── types/                # TypeScript types
│   └── middleware.ts          # Route protection
├── supabase/
│   └── schema.sql            # Database schema + RLS
├── .env.example
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| AI Model | Claude (`claude-haiku-4-5-20251001`) via Anthropic API |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix UI) |
| TypeScript | Yes, end-to-end |
| Deployment | Vercel |

---

## AI Features

All AI features are powered by **Claude Haiku** (`claude-haiku-4-5-20251001`) via the Anthropic API — fast, cheap, and high quality for generation tasks.

| Feature | Where | What it does |
|---------|-------|-------------|
| Caption Generator | Content Planner → Post Editor | Writes a full caption using the brand's tone, niche, pillar, and platform |
| Hashtag Generator | Content Planner → Post Editor | Returns 3 hashtag clusters (broad, niche, specific) ready to use |
| Post Ideas | Content Planner → "Post Ideas" button | Generates 6 post ideas with format and description, one-click to create |
| Niche Framework | Niche Research | Builds a full brand framework: persona, pillars, formats, messages, hashtags, platforms |

The `/api/generate` route handles all generation types with a single endpoint. All prompts inject the brand's context (name, niche, tone, audience, pillar) so output is always relevant and on-brand.

## Notes

- All data is scoped per user using Supabase Row Level Security — users can only ever see and modify their own data
- AI features gracefully degrade — if no API key is set, the app still works fully; buttons will show an error message explaining what's needed
- Email confirmation is enabled by default in Supabase — users must verify their email before logging in
- The `ANTHROPIC_API_KEY` is server-side only (no `NEXT_PUBLIC_` prefix) — it is never exposed to the browser
