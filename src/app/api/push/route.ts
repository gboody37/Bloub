import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/lib/push-config'

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bodyData = await request.json().catch(() => ({}))
  const title = bodyData.title || 'Vibe Todos'
  const body = bodyData.body || 'This is a test notification!'

  // Fetch all push subscriptions registered for this user
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'No subscriptions found for this user.' }, { status: 404 })
  }

  const results = []
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        s.subscription as any,
        JSON.stringify({ title, body })
      )
      results.push({ id: s.id, status: 'success' })
    } catch (err: any) {
      // Delete push subscription from DB if it is no longer valid (expired / blocked)
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
        results.push({ id: s.id, status: 'deleted_expired' })
      } else {
        results.push({ id: s.id, status: 'failed', error: err.message })
      }
    }
  }

  return NextResponse.json({ success: true, results })
}
