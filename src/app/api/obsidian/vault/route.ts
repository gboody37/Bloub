import { NextRequest, NextResponse } from 'next/server';
import { scanVaultDirectory, DEFAULT_VAULT_PATH } from '@/lib/obsidian/scanner';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const headerVault = request.headers.get('x-obsidian-vault-path');
    const vaultPath = searchParams.get('vaultPath') || headerVault || DEFAULT_VAULT_PATH;
    const folder = searchParams.get('folder') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const searchQuery = searchParams.get('q') || searchParams.get('search') || undefined;

    const result = await scanVaultDirectory(vaultPath, folder, tag, searchQuery);

    if (!result.success) {
      const statusCode = result.error === 'VAULT_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'INTERNAL_SERVER_ERROR',
        vaultPath: DEFAULT_VAULT_PATH,
        totalNotes: 0,
        folders: [],
        notes: []
      },
      { status: 500 }
    );
  }
}
