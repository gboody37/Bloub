import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gbdwswfrscjccaaeciiu.supabase.co';
const supabaseAnonKey = 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
