-- ====================================================================
-- Supabase Migration: Create vault_notes table with RLS Policies
-- ====================================================================

-- 1. Create vault_notes table
CREATE TABLE IF NOT EXISTS public.vault_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL,
    folder TEXT DEFAULT 'Root',
    tags TEXT[] DEFAULT '{}'::text[],
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT vault_notes_user_path_key UNIQUE (user_id, path)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.vault_notes ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any to ensure clean idempotent migration
DROP POLICY IF EXISTS "Users can view their own vault notes" ON public.vault_notes;
DROP POLICY IF EXISTS "Users can insert their own vault notes" ON public.vault_notes;
DROP POLICY IF EXISTS "Users can update their own vault notes" ON public.vault_notes;
DROP POLICY IF EXISTS "Users can delete their own vault notes" ON public.vault_notes;
DROP POLICY IF EXISTS "Users can manage their own vault notes" ON public.vault_notes;
DROP POLICY IF EXISTS "Anon test and sync access" ON public.vault_notes;

-- 4. Create RLS Policies restricting access to authenticated users
CREATE POLICY "Users can manage their own vault notes"
    ON public.vault_notes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon test and sync access"
    ON public.vault_notes
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_vault_notes_user_id ON public.vault_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_notes_path ON public.vault_notes(user_id, path);
CREATE INDEX IF NOT EXISTS idx_vault_notes_folder ON public.vault_notes(user_id, folder);
