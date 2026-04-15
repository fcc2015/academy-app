-- Run this in Supabase SQL Editor
ALTER TABLE public.academies 
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_cycle_start timestamptz;
