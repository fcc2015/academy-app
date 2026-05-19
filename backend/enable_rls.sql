-- Enable Row Level Security (RLS) on all core tables to block direct API access.
-- Since the FastAPI backend uses the Service Role key, it will naturally bypass these restrictions.
-- Any direct request using the Supabase public 'anon' key will be blocked.

ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments_gateway ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.finances_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kits ENABLE ROW LEVEL SECURITY;

-- Optional: Create a restrictive policy that explicitly rejects everything unless using service_role
-- (Actually, enabling RLS without policies implicitly denies all access)
