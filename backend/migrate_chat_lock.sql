-- Migration: add is_locked flag to chat_groups
-- Run this in the Supabase SQL editor.

ALTER TABLE chat_groups
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
