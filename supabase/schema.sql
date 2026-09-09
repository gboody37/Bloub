-- ====================================================================
-- BLOUB STUDY SUITE DATABASE SCHEMA
-- ====================================================================

-- 1. Study Quests Table
CREATE TABLE IF NOT EXISTS study_quests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INT DEFAULT 0
);

-- 2. Study Notes & Books Table
CREATE TABLE IF NOT EXISTS study_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  pdf_url TEXT,
  annotations JSONB DEFAULT '[]'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Flashcards Table
CREATE TABLE IF NOT EXISTS study_flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  note_id UUID REFERENCES study_notes(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INT DEFAULT 0,
  hint TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Preferences & Mascot Settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY,
  mascot_shape TEXT DEFAULT 'squircle',
  mascot_color TEXT DEFAULT 'creme',
  theme TEXT DEFAULT 'amber',
  gemini_api_key TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public policies for seamless operation
ALTER TABLE study_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to study_quests" ON study_quests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to study_notes" ON study_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to study_flashcards" ON study_flashcards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed initial study quests matching reference
INSERT INTO study_quests (title, completed, order_index) VALUES
  ('Daily quests', true, 1),
  ('Tasks completed', true, 2),
  ('Develop a complete', true, 3),
  ('Check unure rights', true, 4),
  ('Planned to vactum', true, 5),
  ('Check complete', true, 6),
  ('Workin for complete', false, 7)
ON CONFLICT DO NOTHING;
