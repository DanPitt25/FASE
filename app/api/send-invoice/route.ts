import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Pricing mapping based on premium brackets
const getPriceForPremiumBracket = (bracket: string): number => {
  const priceMap: { [key: string]: number } = {
    '<10m': 900,
    '10-20m': 1500,
    '20-50m': 2000,
    '50-100m': 2800,
    '100-500m': 4200,
    '500m+': 6400,
  };
  return priceMap[bracket] || 900; // Default to €900
};

export async function POST(request: NextRequest) {
  console.log('=== Sending Bank Transfer Invoice ===');
  
  try {
    const requestData = await request.json();
    console.log('Invoice request data:', {
      organizationName: requestData.organizationName,
      organizationType: requestData.organizationType,
      membershipType: requestData.membershipType,
      invoicingContact: requestData.invoicingContact?.email
    });
    
    const { 
      organizationName,
      organizationType,
      membershipType,
      grossWrittenPremiums,
      hasOtherAssociations,
      invoicingContact,
      invoicingAddress,
      userId
    } = requestData;

    // Validate required fields
    if (!organizationName || !invoicingContact?.email || !invoicingContact?.name) {
      return NextResponse.json(
        { error: 'Organization name, invoicing contact name and email are required' },
        { status: 400 }
      );
    }

    // Calculate price based on membership type and premium bracket
    let price = 900; // Default base price €900
    
    if (membershipType === 'individual') {
      price = 500; // €500 for individual memberships
    } else if (organizationType === 'MGA') {
      price = getPriceForPremiumBracket(grossWrittenPremiums);
    }

    // Apply association member discount
    if (hasOtherAssociations && membershipType === 'corporate') {
      price = Math.round(price * 0.8); // 20% discount
    }

    console.log('Calculated price:', price, 'EUR');

    // Generate invoice number (simple timestamp-based)
    const invoiceNumber = `FASE-${Date.now()}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // For now, just log the invoice details (in real implementation, send email)
    const invoiceData = {
      invoiceNumber,
      organizationName,
      organizationType,
      membershipType,
      amount: price,
      currency: 'EUR',
      dueDate: dueDate.toISOString().split('T')[0],
      invoicingContact,
      invoicingAddress,
      description: membershipType === 'individual' 
        ? `FASE Individual Membership - Annual Fee`
        : organizationType === 'MGA' 
          ? `FASE MGA Membership - Annual Fee (${grossWrittenPremiums} premium bracket)${hasOtherAssociations ? ' - Association Member Discount Applied' : ''}`
          : `FASE Corporate Membership - Annual Fee${hasOtherAssociations ? ' - Association Member Discount Applied' : ''}`,
      bankDetails: {
        accountName: 'Federation of European MGAs',
        iban: 'GB29 NWBK 6016 1331 9268 19',
        bic: 'NWBKGB2L',
        reference: invoiceNumber
      }
    };

    console.log('Invoice data prepared:', invoiceData);
    
    // TODO: In a real implementation, send this via email service
    // For now, we'll just return success and log the data
    console.log('=== INVOICE EMAIL WOULD BE SENT ===');
    console.log('To:', invoicingContact.email);
    console.log('Subject: FASE Membership Invoice - ' + invoiceNumber);
    console.log('Invoice Details:', JSON.stringify(invoiceData, null, 2));

    return NextResponse.json({
      success: true,
      invoiceNumber,
      amount: price,
      currency: 'EUR',
      dueDate: dueDate.toISOString().split('T')[0],
      message: 'Invoice email sent successfully (test mode)'
    });

  } catch (error: any) {
    console.error('=== Invoice Email Error ===');
    console.error('Error sending invoice:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send invoice',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}