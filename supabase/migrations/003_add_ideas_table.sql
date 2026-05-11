-- ============================================================
-- Migration 003: Add Ideas Table for Ideas Bank feature
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ALTER TABLE content_pillars ADD COLUMN IF NOT EXISTS weekly_quota integer DEFAULT 2;
-- (Run this if you haven't already)

create type idea_status as enum ('idea', 'draft', 'scheduled', 'posted');

create table if not exists public.ideas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  brand_id     uuid not null references public.brands(id) on delete cascade,
  pillar_id    uuid references public.content_pillars(id) on delete set null,
  format       text not null default 'post' check (format in ('post','carousel','reel')),
  title        text not null default '',
  hook         text,
  caption      text,
  hashtags     text,
  slides       jsonb,
  script       jsonb,
  media_url    text,
  status       idea_status not null default 'idea',
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.ideas enable row level security;

create policy "Users can view own ideas"
  on public.ideas for select
  using (auth.uid() = user_id);

create policy "Users can insert own ideas"
  on public.ideas for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ideas"
  on public.ideas for update
  using (auth.uid() = user_id);

create policy "Users can delete own ideas"
  on public.ideas for delete
  using (auth.uid() = user_id);

create index if not exists ideas_user_id_idx on public.ideas(user_id);
create index if not exists ideas_brand_id_idx on public.ideas(brand_id);
create index if not exists ideas_pillar_id_idx on public.ideas(pillar_id);
create index if not exists ideas_status_idx on public.ideas(status);

create trigger set_ideas_updated_at
  before update on public.ideas
  for each row execute procedure public.set_updated_at();
