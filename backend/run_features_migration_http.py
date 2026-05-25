import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

ADMIN_HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

MIGRATION_SQL = """
-- 1. Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    media_url text,
    media_type text DEFAULT 'image',
    caption text,
    expires_at timestamptz DEFAULT (now() + interval '24 hours'),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'Allow all for service role'
    ) THEN
        CREATE POLICY "Allow all for service role" ON public.stories
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 2. Create advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
    title text NOT NULL,
    media_url text NOT NULL,
    link_url text,
    target_roles text[] DEFAULT '{}',
    target_categories text[] DEFAULT '{}',
    views_count integer DEFAULT 0,
    clicks_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.advertisements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'advertisements' AND policyname = 'Allow all for service role'
    ) THEN
        CREATE POLICY "Allow all for service role" ON public.advertisements
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 3. Add coach_notes to players
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'coach_notes' AND table_schema = 'public') THEN
        ALTER TABLE public.players ADD COLUMN coach_notes text;
    END IF;
END
$$;

-- 4. Add match_attendance to matches
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'match_attendance' AND table_schema = 'public') THEN
        ALTER TABLE public.matches ADD COLUMN match_attendance jsonb DEFAULT '{}'::jsonb;
    END IF;
END
$$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_academy_id ON public.stories(academy_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_advertisements_academy_id ON public.advertisements(academy_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_is_active ON public.advertisements(is_active);
"""

async def run():
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        print("Running Migration SQL via pg/query...")
        res = await client.post(
            f"{SUPABASE_URL}/pg/query",
            json={"query": MIGRATION_SQL},
            headers=ADMIN_HEADERS,
        )
        print(f"pg/query -> {res.status_code}: {res.text[:500]}")
        
        if res.status_code in [200, 201]:
            print("SUCCESS via pg/query")
            return True
            
        print("pg/query failed. Trying rpc/exec_sql (fallback)...")
        res2 = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            json={"query": MIGRATION_SQL},
            headers=ADMIN_HEADERS,
        )
        print(f"rpc/exec_sql -> {res2.status_code}: {res2.text[:500]}")
        return res2.status_code in [200, 201, 204]

if __name__ == "__main__":
    asyncio.run(run())
