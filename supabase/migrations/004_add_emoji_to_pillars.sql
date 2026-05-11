-- Migration 004: Add missing columns to content_pillars
-- Adds emoji, user_id, and sort_order which the app requires but were missing from schema

ALTER TABLE public.content_pillars
  ADD COLUMN IF NOT EXISTS emoji text DEFAULT '📌',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
