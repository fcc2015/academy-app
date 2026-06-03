"""
Migration: Add seasonal pricing columns to subscription_plans table
===================================================================
Run the SQL below in the Supabase Dashboard SQL Editor:
  https://supabase.com/dashboard/project/<your-project>/sql/new

SQL:
"""

SQL = """
-- Add seasonal pricing columns to subscription_plans table
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS is_seasonal    BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_start   TEXT      DEFAULT NULL,   -- MM-DD format (e.g. '09-01')
  ADD COLUMN IF NOT EXISTS season_end     TEXT      DEFAULT NULL,   -- MM-DD format (e.g. '06-30')
  ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT NULL,  -- One-time registration fee (MAD)
  ADD COLUMN IF NOT EXISTS one_time_fee   NUMERIC   DEFAULT NULL;  -- Optional one-time extra fee (MAD)

-- Optional: add a comment to document the date format
COMMENT ON COLUMN subscription_plans.season_start IS 'Season start date in MM-DD format (e.g. 09-01 for September 1st)';
COMMENT ON COLUMN subscription_plans.season_end   IS 'Season end date in MM-DD format (e.g. 06-30 for June 30th)';
"""

print("=" * 60)
print("MANUAL STEP REQUIRED")
print("=" * 60)
print()
print("Copy and run the following SQL in Supabase SQL Editor:")
print("  https://supabase.com/dashboard -> SQL Editor -> New Query")
print()
print(SQL)
print("=" * 60)
print("Once done, the seasonal pricing fields will be available.")

if __name__ == "__main__":
    pass
