# BrandFlow QA Bug Report
**Date:** 12 May 2026  
**Scope:** Dashboard, Content Creator, Content Planner, Settings  
**Deployed at:** https://brandflow-roan.vercel.app  
**Source:** /Users/kimberlybuenaventura/Desktop/BrandFlow

---

## Bugs Fixed (all committed and pushed to `main`)

### 🔴 CRITICAL — Save All Pillars: RLS violation (new row violates row-level security policy)

**Commit:** `7ba814e`  
**File:** `src/app/(dashboard)/content-creator/_components/content-creator-client.tsx`

**Root cause:** The 3-tier pillar save fallback uses `coreInserts` as its last resort — the set of columns guaranteed to be in any schema cache version. But `coreInserts` was missing `user_id`, which the `content_pillars` RLS INSERT policy requires (`auth.uid() = user_id`). Every time the DB fell back to tier 3, it failed with a row-level security error.

**Fix:** Added `user_id: user.id` and `sort_order: i` to `coreInserts`. These are original schema columns (not migrations), so they're always in the schema cache. RLS now passes.

```typescript
// Before — coreInserts missing user_id:
const coreInserts = editedPillars.map((p, i) => ({
  brand_id: brand.id,
  name: p.name.trim() || "Untitled",
  description: p.perspective || p.description || null,
  color: PILLAR_COLORS[i % PILLAR_COLORS.length],
}))

// After — user_id and sort_order added:
const coreInserts = editedPillars.map((p, i) => ({
  brand_id: brand.id,
  user_id: user.id,   // ← required by RLS
  sort_order: i,
  name: p.name.trim() || "Untitled",
  description: p.perspective || p.description || null,
  color: PILLAR_COLORS[i % PILLAR_COLORS.length],
}))
```

---

### 🔴 CRITICAL — "Save to Planner" silently lost all saves

**Commit:** `3514043`  
**File:** `src/app/(dashboard)/content-creator/_components/content-creator-client.tsx`

**Root cause:** The three "Save to Planner" handlers (`handleSavePost`, `handleSaveCarousel`, `handleSaveReel`) were inserting into the `posts` table. But the Content Planner page reads exclusively from the `ideas` table. Everything a user saved via "Save to Planner" was written to a table the app never displays — silently discarded from the user's perspective.

**Fix:** Rewired all three handlers to insert into the `ideas` table (with `status: "draft"`), matching what the Content Planner's Ideas Bank reads. Updated toast messages to correctly say "Ideas Bank" instead of "planner".

---

### 🟡 UX — Social account disconnect had no confirmation

**Commit:** `94b553c`  
**Files:** `dashboard/_components/social-connect.tsx`, `settings/_components/settings-client.tsx`

**Issue:** Clicking "Disconnect" on a social account immediately removed it with no confirmation. One misclick permanently erased the handle.

**Fix:** Added `window.confirm()` prompt naming the platform before proceeding with the disconnect in both locations.

---

### 🟡 UX — Target audience field not rendering line breaks on Dashboard

**Commit:** `94b553c`  
**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Issue:** Multi-line target audience text (with `\n` or `*` bullets from AI generation) rendered as one collapsed line. The asterisk stripping (`replace(/\* /g, "• ").replace(/\*/g, "")`) was already applied, but `whitespace-pre-line` was missing from the container.

**Fix:** Added `whitespace-pre-line` class to the `<p>` tag for the target audience field.

---

### 🟡 UX — Content Pillars page delete had no confirmation

**Commit:** `93e8332`  
**File:** `src/app/(dashboard)/content-pillars/page.tsx`

**Issue:** The direct-access `/content-pillars` page (accessible from the Dashboard "Add pillar" link) had a Delete button with no confirmation. One click instantly deleted a pillar with no undo.

**Fix:** Added `window.confirm()` naming the pillar before deletion.

---

## Outstanding: Manual DB Migration Required

The app's correct Supabase project (`qshxmbzskpdpxksvkeja`) is missing several columns that the Content Creator uses. The 3-tier fallback gracefully handles this by saving with core columns only — pillars **will save** — but voice direction, format preference, weekly quota, and emoji will not persist until these are applied.

**Run this SQL in your Supabase dashboard → SQL Editor:**

```sql
-- Step 1: Add missing columns to content_pillars
ALTER TABLE public.content_pillars
  ADD COLUMN IF NOT EXISTS emoji text DEFAULT '📌',
  ADD COLUMN IF NOT EXISTS voice_direction text,
  ADD COLUMN IF NOT EXISTS format_preference text DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS weekly_quota integer DEFAULT 2;

-- Step 2: Refresh PostgREST schema cache so columns are visible immediately
SELECT pg_notify('pgrst', 'reload schema');

-- Step 3: Create the ideas table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.ideas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id     uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  pillar_id    uuid REFERENCES public.content_pillars(id) ON DELETE SET NULL,
  format       text NOT NULL DEFAULT 'post' CHECK (format IN ('post','carousel','reel')),
  title        text NOT NULL DEFAULT '',
  hook         text,
  caption      text,
  hashtags     text,
  slides       jsonb,
  script       jsonb,
  media_url    text,
  status       text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','draft','scheduled','posted')),
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ideas' AND policyname = 'Users manage own ideas'
  ) THEN
    CREATE POLICY "Users manage own ideas" ON public.ideas FOR ALL USING (auth.uid() = user_id);
  END IF;
END
$$;
```

---

## No Bugs Found In

- Content Planner: Generate My Week API route, drag-and-drop, mark-as-posted, Develop button navigation, Clear Week
- All 13 API routes: every one has auth guard, API key check, try/catch, and proper error responses
- Settings: Save Profile, Save Brand, Create Brand, Change Password, Danger Zone delete (requires typing "DELETE")
- Dashboard: Brand Profile card, Content Pillars summary, Social Connect section
- localStorage helpers: SSR-safe, error-guarded
- `handleSaveIdea` (Ideas Bank save): correct payload, graceful handling when `ideas` table is missing
- `addEmptyPillar`, `deletePillar`, `updateSavedPillar`: all correct
- `useSavedInsights` hook: localStorage-based, deduplication works correctly
- TypeScript errors: all are Supabase type-inference issues (`never` type), not runtime bugs — `ignoreBuildErrors: true` in next.config.js means they don't affect builds

---

## Git Log (fixes this session)

```
3514043 fix: redirect Save-to-Planner from posts table to ideas table
93e8332 fix: add delete confirmation to content-pillars page
7ba814e fix: add user_id + sort_order to coreInserts so RLS INSERT policy passes
04cc504 chore: gitignore .claude worktrees directory
2705b84 fix: 3-tier pillar save fallback for stale PostgREST schema cache
94b553c fix: add disconnect confirmation + fix target audience line breaks
0c7a2c3 fix: make saveAllPillars fallback robust to schema cache lag
8123789 fix: migration banner false-positive + strip markdown asterisks from target audience
```
