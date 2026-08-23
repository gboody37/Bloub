import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: notes, error } = await supabase
      .from('vault_notes')
      .select('id, title, content, folder')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const nodesMap = new Map();
    const links: any[] = [];

    notes.forEach((note: any) => {
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

    notes.forEach((note: any) => {
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
