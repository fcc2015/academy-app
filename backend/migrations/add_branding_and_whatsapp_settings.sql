-- ============================================================
-- Migration: Add branding colors and WhatsApp settings to academy_settings
-- Run ONCE in Supabase SQL Editor
-- ============================================================

-- Proper primary/secondary color columns (replaces JSON-in-about_text hack)
ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f46e5';

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#7c3aed';

-- WhatsApp auto-notification toggles
ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS whatsapp_absence_alert BOOLEAN DEFAULT true;

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS whatsapp_payment_reminder BOOLEAN DEFAULT true;

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS whatsapp_language TEXT DEFAULT 'ar';

-- Migrate existing colors from about_text JSON (safe — only runs if about_text starts with '{')
UPDATE academy_settings
SET
  primary_color = COALESCE(
    (about_text::jsonb ->> 'primary_color'),
    '#4f46e5'
  ),
  secondary_color = COALESCE(
    (about_text::jsonb ->> 'secondary_color'),
    '#7c3aed'
  ),
  about_text = COALESCE(
    (about_text::jsonb ->> 'about_text'),
    about_text
  )
WHERE about_text IS NOT NULL
  AND about_text LIKE '{%';
