import { NextRequest, NextResponse } from 'next/server';
import { getVaultTags, DEFAULT_VAULT_PATH } from '@/lib/obsidian/scanner';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const headerVault = request.headers.get('x-obsidian-vault-path');
    const vaultPath = searchParams.get('vaultPath') || headerVault || DEFAULT_VAULT_PATH;

    const result = await getVaultTags(vaultPath);

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
