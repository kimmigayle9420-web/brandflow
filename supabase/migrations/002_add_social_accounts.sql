-- Add social_accounts JSONB column to profiles
-- Stores platform handles as { "instagram": "@handle", "tiktok": "@handle", ... }
alter table public.profiles
  add column if not exists social_accounts jsonb default '{}'::jsonb;
