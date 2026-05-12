-- Migration 006: Add scheduled_at (timestamptz) and platform to ideas
-- Powers the Calendar week view — week grid needs a time-of-day,
-- and chip colour dots need to know which platform the post is for.
-- scheduled_date (date) from 005 stays for backwards-compat.

ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS platform text;

CREATE INDEX IF NOT EXISTS ideas_scheduled_at_idx ON public.ideas(scheduled_at);
