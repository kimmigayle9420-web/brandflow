-- Migration 005: Add scheduled_date to ideas
-- Lets Studio's Save-to-Planner persist when a user wants the idea scheduled.

ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS scheduled_date date;

CREATE INDEX IF NOT EXISTS ideas_scheduled_date_idx ON public.ideas(scheduled_date);
