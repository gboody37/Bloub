import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    let supabase = anonSupabase;
    let userId: string | undefined;

    try {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (user) {
        supabase = serverClient;
        userId = user.id;
      }
    } catch {
      // Fallback
    }

    let query = supabase.from('todos').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: todos, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(todos || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let supabase = anonSupabase;
    let userId: string | undefined;

    try {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (user) {
        supabase = serverClient;
        userId = user.id;
      }
    } catch {
      // Fallback
    }

    const newTodo = {
      id: Date.now().toString(),
      text: body.text,
      completed: false,
      user_id: userId,
      categoryid: body.categoryId || 'default'
    };

    const { error } = await supabase.from('todos').insert([newTodo]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add todo' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    let supabase = anonSupabase;

    try {
      const serverClient = await createClient();
      supabase = serverClient;
    } catch {
      // Fallback
    }

    const { error } = await supabase
      .from('todos')
      .update(body)
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...body });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    let supabase = anonSupabase;
    try {
      const serverClient = await createClient();
      supabase = serverClient;
    } catch {
      // Fallback
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete todo' }, { status: 500 });
  }
}
