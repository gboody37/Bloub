import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://gbdwswfrscjccaaeciiu.supabase.co',
    'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr'
  )
}
