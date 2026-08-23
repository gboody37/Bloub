import { NextRequest, NextResponse } from 'next/server';
import { getNoteByPath } from '@/lib/obsidian/scanner';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notePath = searchParams.get('path') || searchParams.get('notePath') || searchParams.get('file');

    if (!notePath) {
      return NextResponse.json(
        { success: false, error: 'PATH_REQUIRED' },
        { status: 400 }
      );
    }

    let supabase = anonSupabase;
    let userId = searchParams.get('userId') || request.headers.get('x-user-id') || undefined;

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

    const result = await getNoteByPath(notePath, undefined, userId, supabase);

    return NextResponse.json(
      {
        success: result.success,
        note: result.note,
        error: result.error
      },
      { status: result.statusCode }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const notePath = body?.path || body?.notePath || body?.file;

    if (!notePath) {
      return NextResponse.json(
        { success: false, error: 'PATH_REQUIRED' },
        { status: 400 }
      );
    }

    let supabase = anonSupabase;
    let userId = body.userId || request.headers.get('x-user-id') || undefined;

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

    const result = await getNoteByPath(notePath, undefined, userId, supabase);

    return NextResponse.json(
      {
        success: result.success,
        note: result.note,
        error: result.error
      },
      { status: result.statusCode }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
