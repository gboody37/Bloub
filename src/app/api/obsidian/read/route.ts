import { NextRequest, NextResponse } from 'next/server';
import { getNoteByPath, DEFAULT_VAULT_PATH } from '@/lib/obsidian/scanner';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notePath = searchParams.get('path') || searchParams.get('notePath') || searchParams.get('file');
    const headerVault = request.headers.get('x-obsidian-vault-path');
    const vaultPath = searchParams.get('vaultPath') || headerVault || DEFAULT_VAULT_PATH;

    if (!notePath) {
      return NextResponse.json(
        { success: false, error: 'PATH_REQUIRED' },
        { status: 400 }
      );
    }

    const result = await getNoteByPath(notePath, vaultPath);

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
