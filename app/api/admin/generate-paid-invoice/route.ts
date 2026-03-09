import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { generateRendezvousPaidInvoicePDF, RendezvousInvoiceData } from '@/lib/rendezvous-invoice-generator';

export const dynamic = 'force-dynamic';

interface RequestData {
  invoiceNumber: string;
  registrationId: string;
  companyName: string;
  billingEmail: string;
  address?: string;
  country: string;
  attendees: Array<{
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  }>;
  pricePerTicket: number;
  numberOfTickets: number;
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  totalPrice: number;
  discount: number;
  discountReason?: string;
  isFaseMember: boolean;
  isAsaseMember: boolean;
  organizationType: string;
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const data: RequestData = await request.json();

    if (!data.companyName) {
      return NextResponse.json(
        { error: 'Missing company name' },
        { status: 400 }
      );
    }

    // Generate invoice number if not provided (e.g., for Stripe payments)
    const invoiceNumber = data.invoiceNumber || `RDV-${new Date().getFullYear()}-${data.registrationId?.slice(-8)?.toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    // Prepare data for the shared PDF generator
    const invoiceData: RendezvousInvoiceData = {
      invoiceNumber,
      registrationId: data.registrationId,
      companyName: data.companyName,
      billingEmail: data.billingEmail,
      address: data.address,
      country: data.country,
      attendees: data.attendees,
      pricePerTicket: data.pricePerTicket,
      numberOfTickets: data.numberOfTickets,
      subtotal: data.subtotal,
      vatAmount: data.vatAmount,
      vatRate: data.vatRate,
      totalPrice: data.totalPrice,
      discount: data.discount,
      discountReason: data.discountReason,
      isFaseMember: data.isFaseMember,
      isAsaseMember: data.isAsaseMember,
      organizationType: data.organizationType,
    };

    // Generate the PAID PDF using the shared library
    const result = await generateRendezvousPaidInvoicePDF(invoiceData);

    return NextResponse.json({
      success: true,
      pdfBase64: result.pdfBase64,
      invoiceNumber: invoiceNumber,
      filename: `${invoiceNumber}-PAID.pdf`
    });

  } catch (error: any) {
    console.error('Error generating paid invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
