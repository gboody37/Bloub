
const fs = require('fs');
const replacement = \import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabase as anonSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let supabase = anonSupabase;
    let userId = searchParams.get('userId') || req.headers.get('x-user-id');

    try {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (user) {
        supabase = serverClient;
        userId = user.id;
      }
    } catch {}

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: notes, error } = await supabase
      .from('vault_notes')
      .select('title, content, folder, path')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const nodesMap = new Map();
    const links = [];

    (notes || []).forEach((note) => {
      const normalizedTitle = note.title.toLowerCase();
      nodesMap.set(normalizedTitle, {
        id: normalizedTitle,
        name: note.title,
        folder: note.folder,
        isGhost: false,
        val: 2
      });
    });

    const linkRegex = /\[\[(.*?)\]\]/g;

    (notes || []).forEach((note) => {
      const sourceId = note.title.toLowerCase();
      const content = note.content || '';
      
      let match;
      const seenTargets = new Set();

      while ((match = linkRegex.exec(content)) !== null) {
        let targetStr = match[1].split('|')[0].trim();
        targetStr = targetStr.split('#')[0].trim();
        if (!targetStr) continue;

        const targetId = targetStr.toLowerCase();

        if (targetId === sourceId || seenTargets.has(targetId)) continue;
        seenTargets.add(targetId);

        if (!nodesMap.has(targetId)) {
          nodesMap.set(targetId, {
            id: targetId,
            name: targetStr,
            folder: 'Unknown',
            isGhost: true,
            val: 1
          });
        }

        const targetNode = nodesMap.get(targetId);
        if (targetNode) targetNode.val += 0.5;

        links.push({
          source: sourceId,
          target: targetId
        });
      }
    });

    return NextResponse.json({ success: true, graph: { nodes: Array.from(nodesMap.values()), links } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
\;
fs.writeFileSync('src/app/api/obsidian/graph/route.ts', replacement);

