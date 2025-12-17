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
    
    // Define valid template keys
    const validTemplateKeys = [
      'membership_acceptance_admin',
      'invoice_delivery', 
      'lost_invoice',
      'payment_reminder',
      'member_portal_welcome',
      'membership_followup',
      'payment_confirmed_welcome',
      'invoice',
      'join_request_approved',
      'join_request_update'
    ];
    
    if (!validTemplateKeys.includes(templateKey)) {
      return NextResponse.json(
        { error: `Invalid template key. Valid keys: ${validTemplateKeys.join(', ')}` },
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