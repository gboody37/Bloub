import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const pdfParse = (await import('pdf-parse')).default || require('pdf-parse');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const data = await pdfParse(Buffer.from(buffer));

    return NextResponse.json({ success: true, text: data.text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
