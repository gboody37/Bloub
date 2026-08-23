import { NextRequest, NextResponse } from 'next/server';
import { scanVaultDirectory, batchUpsertVaultNotes } from '@/lib/obsidian/scanner';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const searchQuery = searchParams.get('q') || searchParams.get('search') || undefined;

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
      // Fallback to anon client
    }

    const result = await scanVaultDirectory(undefined, folder, tag, searchQuery, userId, supabase);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_SERVER_ERROR',
        vaultPath: 'Cloud Vault',
        totalNotes: 0,
        folders: [],
        notes: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase = anonSupabase;
    let userId = request.headers.get('x-user-id') || undefined;

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

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_JSON_BODY' },
        { status: 400 }
      );
    }
    const effectiveUserId = body?.userId || userId;

    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: 'USER_AUTHENTICATION_REQUIRED' },
        { status: 401 }
      );
    }

    const rawNotes = Array.isArray(body.notes) ? body.notes : [body];
    const notesToUpsert = rawNotes.map((n: any) => ({
      user_id: effectiveUserId,
      title: n.title || 'Untitled',
      content: n.content || '',
      path: n.path || n.relativePath || 'untitled.md',
      folder: n.folder || 'Root',
      tags: Array.isArray(n.tags) ? n.tags : [],
      word_count: n.word_count || n.wordCount || 0
    }));

    const result = await batchUpsertVaultNotes(notesToUpsert, supabase);

    return NextResponse.json(
      {
        success: result.success,
        count: result.count,
        error: result.error
      },
      { status: result.success ? 200 : 400 }
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
