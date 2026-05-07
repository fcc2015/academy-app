-- Migration: allow 'match_manager' as an admin_type
-- Run this in the Supabase SQL editor.

DO $$
DECLARE
    cons RECORD;
BEGIN
    FOR cons IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'admins'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%admin_type%'
    LOOP
        EXECUTE format('ALTER TABLE admins DROP CONSTRAINT %I', cons.conname);
    END LOOP;
END $$;

ALTER TABLE admins
    ADD CONSTRAINT admins_admin_type_check
    CHECK (admin_type IN ('admin', 'employee', 'accountant', 'sous_admin', 'match_manager'));
