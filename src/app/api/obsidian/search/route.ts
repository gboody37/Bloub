import { NextRequest, NextResponse } from 'next/server';
import { searchVaultNotes } from '@/lib/obsidian/scanner';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const tag = searchParams.get('tag') || undefined;
    const folder = searchParams.get('folder') || undefined;

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

    const result = await searchVaultNotes(query, undefined, tag, folder, userId, supabase);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_SERVER_ERROR',
        results: []
      },
      { status: 500 }
    );
  }
}
