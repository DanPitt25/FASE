import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let stripe: Stripe;

// Initialize Stripe at runtime
const initializeStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

// Pricing mapping based on premium brackets
const getPriceForPremiumBracket = (bracket: string): number => {
  const priceMap: { [key: string]: number } = {
    '<10m': 90000, // €900 in cents
    '10-20m': 150000, // €1,500 in cents
    '20-50m': 200000, // €2,000 in cents
    '50-100m': 280000, // €2,800 in cents
    '100-500m': 420000, // €4,200 in cents
    '500m+': 640000, // €6,400 in cents
  };
  return priceMap[bracket] || 90000; // Default to €900
};

export async function POST(request: NextRequest) {
  console.log('=== Creating Stripe Invoice ===');
  
  try {
    // Initialize Stripe at runtime
    const stripeInstance = initializeStripe();
    
    if (!stripeInstance) {
      console.error('Stripe initialization failed');
      return NextResponse.json(
        { error: 'Payment processing not available' },
        { status: 503 }
      );
    }
    
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
    let priceInCents = 90000; // Default base price €900
    
    if (membershipType === 'individual') {
      priceInCents = 50000; // €500 for individual memberships
    } else if (organizationType === 'MGA') {
      priceInCents = getPriceForPremiumBracket(grossWrittenPremiums);
    }

    // Apply association member discount
    if (hasOtherAssociations && membershipType === 'corporate') {
      priceInCents = Math.round(priceInCents * 0.8); // 20% discount
    }

    console.log('Calculated price:', priceInCents / 100, 'EUR');

    // Create or find customer
    let customer;
    try {
      // Try to find existing customer by email
      const existingCustomers = await stripeInstance.customers.list({
        email: invoicingContact.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log('Found existing customer:', customer.id);
      } else {
        // Create new customer
        customer = await stripeInstance.customers.create({
          email: invoicingContact.email,
          name: invoicingContact.name,
          description: `${organizationName} - FASE Membership`,
          metadata: {
            organization_name: organizationName,
            organization_type: organizationType || 'individual',
            membership_type: membershipType,
            user_id: userId || '',
          },
          ...(invoicingAddress && {
            address: {
              line1: invoicingAddress.line1,
              line2: invoicingAddress.line2 || undefined,
              city: invoicingAddress.city,
              state: invoicingAddress.county || undefined,
              postal_code: invoicingAddress.postcode,
              country: invoicingAddress.country === 'United Kingdom' ? 'GB' : 'DE' // Default mapping
            }
          })
        });
        console.log('Created new customer:', customer.id);
      }
    } catch (error) {
      console.error('Error handling customer:', error);
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      );
    }

    // Create invoice
    const invoice = await stripeInstance.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 30,
      description: `FASE ${membershipType === 'individual' ? 'Individual' : organizationType} Membership - ${organizationName}`,
      metadata: {
        organization_name: organizationName,
        organization_type: organizationType || 'individual',
        membership_type: membershipType,
        user_id: userId || '',
        gross_written_premiums: grossWrittenPremiums || '',
        has_association_discount: hasOtherAssociations ? 'true' : 'false'
      },
      automatic_tax: {
        enabled: true
      }
    });

    console.log('Created invoice:', invoice.id);

    // Add invoice item
    await stripeInstance.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: priceInCents,
      currency: 'eur',
      description: membershipType === 'individual' 
        ? `FASE Individual Membership - Annual Fee`
        : organizationType === 'MGA' 
          ? `FASE MGA Membership - Annual Fee (${grossWrittenPremiums} premium bracket)${hasOtherAssociations ? ' - Association Member Discount Applied' : ''}`
          : `FASE Corporate Membership - Annual Fee${hasOtherAssociations ? ' - Association Member Discount Applied' : ''}`,
      metadata: {
        membership_type: membershipType,
        organization_type: organizationType || 'individual',
        original_amount: getPriceForPremiumBracket(grossWrittenPremiums).toString(),
        discount_applied: hasOtherAssociations ? 'true' : 'false'
      }
    });

    console.log('Added invoice item');

    // Send the invoice
    const sentInvoice = await stripeInstance.invoices.sendInvoice(invoice.id);
    
    console.log('Invoice sent successfully:', {
      invoiceId: sentInvoice.id,
      hostedInvoiceUrl: sentInvoice.hosted_invoice_url,
      invoicePdf: sentInvoice.invoice_pdf,
      status: sentInvoice.status
    });

    return NextResponse.json({
      success: true,
      invoiceId: sentInvoice.id,
      hostedInvoiceUrl: sentInvoice.hosted_invoice_url,
      invoicePdf: sentInvoice.invoice_pdf,
      customerEmail: invoicingContact.email,
      amount: priceInCents / 100,
      currency: 'EUR',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error: any) {
    console.error('=== Stripe Invoice Creation Error ===');
    console.error('Error creating invoice:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    
    return NextResponse.json(
      { 
        error: 'Failed to create invoice',
        details: error.message || 'Unknown error',
        type: error.type || 'unknown'
      },
      { status: 500 }
    );
  }
}