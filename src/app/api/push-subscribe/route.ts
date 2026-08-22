import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subscription } = await request.json()

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription missing' }, { status: 400 })
  }

  // Save subscription to the database
  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: user.id,
      subscription: subscription
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
