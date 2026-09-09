import { createClient } from '@/lib/supabase/client';
import type { StudyQuest, StudyNote, UserSettings } from '@/types/study';

const DEFAULT_QUESTS: StudyQuest[] = [
  { id: 'mock-1', title: 'Daily quests', completed: true, order_index: 1 },
  { id: 'mock-2', title: 'Tasks completed', completed: true, order_index: 2 },
  { id: 'mock-3', title: 'Develop a complete', completed: true, order_index: 3 },
  { id: 'mock-4', title: 'Check unure rights', completed: true, order_index: 4 },
  { id: 'mock-5', title: 'Planned to vactum', completed: true, order_index: 5 },
  { id: 'mock-6', title: 'Check complete', completed: true, order_index: 6 },
  { id: 'mock-7', title: 'Workin for complete', completed: false, order_index: 7 },
];

export async function fetchQuests(): Promise<StudyQuest[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('study_quests')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('[Bloub Service] Remote fetch failed, falling back to local:', err);
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('bloub_quests');
      if (stored) return JSON.parse(stored);
    } catch {}
  }

  return DEFAULT_QUESTS;
}

export async function saveQuestToggle(id: string, completed: boolean): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('study_quests').update({ completed }).eq('id', id);
  } catch (e) {
    // Ignore remote failure
  }
}

export async function createQuest(title: string): Promise<StudyQuest> {
  const newQuest: StudyQuest = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'quest_' + Date.now(),
    title,
    completed: false,
    order_index: Date.now(),
    created_at: new Date().toISOString()
  };

  try {
    const supabase = createClient();
    await supabase.from('study_quests').insert([newQuest]);
  } catch (e) {
    // Ignore remote failure
  }

  return newQuest;
}

export async function removeQuest(id: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('study_quests').delete().eq('id', id);
  } catch (e) {
    // Ignore remote failure
  }
}
