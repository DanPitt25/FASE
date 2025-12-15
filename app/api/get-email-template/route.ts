import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateKey = searchParams.get('templateKey');
    
    // Validate input
    if (!templateKey) {
      return NextResponse.json(
        { error: 'Template key is required' },
        { status: 400 }
      );
    }
    
    // Only allow reading the membership_acceptance_admin template for now
    if (templateKey !== 'membership_acceptance_admin') {
      return NextResponse.json(
        { error: 'Only membership_acceptance_admin template can be read' },
        { status: 400 }
      );
    }
    
    // Path to the email translation file
    const filePath = path.join(process.cwd(), 'messages', 'en', 'email.json');
    
    // Read file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const emailTranslations = JSON.parse(fileContent);
    
    const template = emailTranslations[templateKey];
    
    if (!template) {
      return NextResponse.json(
        { error: `Template ${templateKey} not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      template
    });
    
  } catch (error: any) {
    console.error('❌ Error reading email template:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}