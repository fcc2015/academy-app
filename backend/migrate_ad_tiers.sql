-- ============================================================
-- Migration: Add ad_type column to advertisements table
-- Run this SQL in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/sql/new
-- ============================================================

-- Add ad_type column to advertisements table if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advertisements' AND column_name = 'ad_type' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.advertisements ADD COLUMN ad_type text DEFAULT 'general' CHECK (ad_type IN ('general', 'pro', '1to1'));
    END IF;
END
$$;

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advertisements';
