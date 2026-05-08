-- Migration: add u_category to coaches so admin can pin a coach to a U category
-- Run in Supabase SQL editor.

ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS u_category VARCHAR(50);
