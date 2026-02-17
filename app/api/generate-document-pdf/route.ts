import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentPDF } from '../../../lib/document-pdf-generator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // Validate required fields
    if (!requestData.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!requestData.body?.trim()) {
      return NextResponse.json({ error: 'Body text is required' }, { status: 400 });
    }

    console.log('Generating document PDF:', requestData.title);

    const result = await generateDocumentPDF({
      title: requestData.title,
      body: requestData.body,
      date: requestData.date,
    });

    return NextResponse.json({
      success: true,
      title: result.title,
      pdfBase64: result.pdfBase64,
    });

  } catch (error: any) {
    console.error('Failed to generate document PDF:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
