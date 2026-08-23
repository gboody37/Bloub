import { NextRequest, NextResponse } from 'next/server';
import { getVaultTags } from '@/lib/obsidian/scanner';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

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

    const result = await getVaultTags(undefined, userId, supabase);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_SERVER_ERROR',
        tags: []
      },
      { status: 500 }
    );
  }
}
