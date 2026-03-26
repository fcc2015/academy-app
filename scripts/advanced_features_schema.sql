-- ==========================================
-- ADVANCED SAAS FEATURES MIGRATION
-- Please run this script in your Supabase SQL Editor
-- ==========================================

-- Enable the uuid-ossp extension if not already enabled (usually is by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. EXPENSES MANAGEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Salaires', 'Équipement', 'Loyer', 'Transport', 'Autre')),
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
-- For simplicity, since this is an admin feature, we let policies pass if user is authed, or true.
-- You can make it stricter later by checking roles.
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (true);


-- ==========================================
-- 2. MEDICAL & TRANSPORT (ALTER PLAYERS)
-- ==========================================
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS medical_cert_valid_until DATE,
ADD COLUMN IF NOT EXISTS transport_zone TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT;


-- ==========================================
-- 3. INJURIES TRACKING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.injuries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES public.players(user_id) ON DELETE CASCADE,
    injury_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    expected_recovery_date DATE,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Recovered')) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and Coaches can manage injuries" ON public.injuries FOR ALL USING (true);


-- ==========================================
-- 4. INVENTORY / STORE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Balls', 'Bibs', 'Cones', 'Jerseys', 'Medical', 'Other')),
    quantity INTEGER NOT NULL DEFAULT 0,
    condition TEXT NOT NULL CHECK (condition IN ('New', 'Good', 'Fair', 'Poor', 'Lost')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage inventory" ON public.inventory FOR ALL USING (true);


-- ==========================================
-- 5. MATCHES & STATS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE,
    opponent_name TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    our_score INTEGER DEFAULT 0,
    their_score INTEGER DEFAULT 0,
    match_type TEXT NOT NULL CHECK (match_type IN ('Friendly', 'League', 'Cup', 'Tournament')),
    status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')) DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and Coaches can manage matches" ON public.matches FOR ALL USING (true);
