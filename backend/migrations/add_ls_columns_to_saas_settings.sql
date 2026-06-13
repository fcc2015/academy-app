-- ============================================================
-- Migration: Add Lemon Squeezy columns to saas_settings
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- Add lemon_squeezy_api_key column (stores encrypted/plain key from dashboard)
ALTER TABLE saas_settings
  ADD COLUMN IF NOT EXISTS lemon_squeezy_api_key TEXT DEFAULT NULL;

-- Add lemon_squeezy_signing_secret column
ALTER TABLE saas_settings
  ADD COLUMN IF NOT EXISTS lemon_squeezy_signing_secret TEXT DEFAULT NULL;

-- Ensure the table has at least one row (upsert seed)
INSERT INTO saas_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
