-- ============================================================
-- BrandFlow Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
-- Extends auth.users with additional profile info
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  avatar_url      text,
  social_accounts jsonb default '{}'::jsonb,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Brands ────────────────────────────────────────────────────
create table if not exists public.brands (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  niche            text not null,
  target_audience  text,
  tone_of_voice    text,
  primary_color    text default '#6366f1',
  secondary_color  text default '#a5b4fc',
  logo_url         text,
  website_url      text,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

alter table public.brands enable row level security;

create policy "Users can view own brands"
  on public.brands for select
  using (auth.uid() = user_id);

create policy "Users can insert own brands"
  on public.brands for insert
  with check (auth.uid() = user_id);

create policy "Users can update own brands"
  on public.brands for update
  using (auth.uid() = user_id);

create policy "Users can delete own brands"
  on public.brands for delete
  using (auth.uid() = user_id);

-- ── Content Pillars ───────────────────────────────────────────
create table if not exists public.content_pillars (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  color       text default '#6366f1',
  sort_order  integer default 0,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.content_pillars enable row level security;

create policy "Users can view own content pillars"
  on public.content_pillars for select
  using (auth.uid() = user_id);

create policy "Users can insert own content pillars"
  on public.content_pillars for insert
  with check (auth.uid() = user_id);

create policy "Users can update own content pillars"
  on public.content_pillars for update
  using (auth.uid() = user_id);

create policy "Users can delete own content pillars"
  on public.content_pillars for delete
  using (auth.uid() = user_id);

-- ── Posts ─────────────────────────────────────────────────────
create type post_status as enum ('draft', 'scheduled', 'published', 'archived');
create type post_platform as enum ('instagram', 'tiktok', 'twitter', 'linkedin', 'facebook', 'youtube', 'pinterest', 'other');

create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid not null references public.brands(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  pillar_id      uuid references public.content_pillars(id) on delete set null,
  platform       post_platform not null default 'instagram',
  format         text not null default 'static',
  caption_draft  text,
  media_url      text,
  hashtags       text,
  scheduled_date date,
  status         post_status not null default 'draft',
  notes          text,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null
);

alter table public.posts enable row level security;

create policy "Users can view own posts"
  on public.posts for select
  using (auth.uid() = user_id);

create policy "Users can insert own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists brands_user_id_idx on public.brands(user_id);
create index if not exists content_pillars_brand_id_idx on public.content_pillars(brand_id);
create index if not exists content_pillars_user_id_idx on public.content_pillars(user_id);
create index if not exists posts_brand_id_idx on public.posts(brand_id);
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_scheduled_date_idx on public.posts(scheduled_date);

-- ── Updated_at triggers ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute procedure public.set_updated_at();

create trigger set_pillars_updated_at
  before update on public.content_pillars
  for each row execute procedure public.set_updated_at();

create trigger set_posts_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();
