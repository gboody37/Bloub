import { NextRequest, NextResponse } from 'next/server';
import { atomicFlushNote, updateNotePdfAnnotations } from '@/lib/obsidian/scanner';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id'
    }
  });
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
      // Fallback to anonymous client if cookie context unavailable
    }

    let rawBody: any = null;

    // Handle JSON or plain-text payload (common in navigator.sendBeacon)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        rawBody = await request.json();
      } catch {
        const text = await request.text();
        rawBody = text ? JSON.parse(text) : {};
      }
    } else {
      const text = await request.text();
      try {
        rawBody = text ? JSON.parse(text) : {};
      } catch {
        rawBody = { textContent: text };
      }
    }

    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: 'EMPTY_FLUSH_PAYLOAD' },
        { status: 400 }
      );
    }

    const payloadArray = Array.isArray(rawBody) ? rawBody : [rawBody];
    const results: any[] = [];
    let allSuccess = true;

    for (const item of payloadArray) {
      const effectiveUserId = item.userId || userId;
      const noteIdentifier = item.noteId || item.id || item.notePath || item.path || item.relativePath;
      const pdfNotesPayload = item.pdfNotes ?? item.pdf_notes;

      // 1. If explicit PDF annotations flush
      if (noteIdentifier && pdfNotesPayload !== undefined) {
        const pdfNotesStr = typeof pdfNotesPayload === 'string'
          ? pdfNotesPayload
          : JSON.stringify(pdfNotesPayload);

        const res = await updateNotePdfAnnotations(noteIdentifier, pdfNotesStr, effectiveUserId, supabase);
        results.push(res);
        if (!res.success) allSuccess = false;
        continue;
      }

      // 2. Generic atomic flush (frontmatter updates or markdown body updates)
      const res = await atomicFlushNote({
        noteId: item.noteId || item.id,
        notePath: item.notePath || item.path || item.relativePath,
        pdfNotes: pdfNotesPayload,
        content: item.content,
        title: item.title,
        folder: item.folder,
        tags: item.tags,
        frontmatterUpdates: item.frontmatterUpdates
      }, effectiveUserId, supabase);

      results.push(res);
      if (!res.success) allSuccess = false;
    }

    return NextResponse.json(
      {
        success: allSuccess,
        results: Array.isArray(rawBody) ? results : results[0],
        flushedCount: results.filter(r => r.success).length
      },
      { status: allSuccess ? 200 : (results.some(r => r.success) ? 207 : 400) }
    );
  } catch (error: any) {
    console.error('[FlushEndpoint] Unhandled flush error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_FLUSH_ERROR'
      },
      { status: 500 }
    );
  }
}
