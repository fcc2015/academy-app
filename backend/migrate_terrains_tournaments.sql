-- Migration: add terrains + tournaments_list to academy_settings
-- Run this in the Supabase SQL editor.

ALTER TABLE academy_settings
    ADD COLUMN IF NOT EXISTS terrains JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tournaments_list JSONB DEFAULT '[]'::jsonb;

-- Drop the old strict CHECK constraint on matches.match_type if present,
-- so academies can use their own tournament names (CHALLENGER, GOLDEN, etc.).
DO $$
DECLARE
    cons RECORD;
BEGIN
    FOR cons IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'matches'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%match_type%'
    LOOP
        EXECUTE format('ALTER TABLE matches DROP CONSTRAINT %I', cons.conname);
    END LOOP;
END $$;
