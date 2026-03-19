import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { generateRendezvousInvoicePDF, RendezvousInvoiceData } from '@/lib/rendezvous-invoice-generator';
import { generateInvoiceNumber, uploadInvoicePDF } from '@/lib/invoice-service';

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
  forceCurrency?: 'EUR' | 'GBP' | 'USD';
  vatNumber?: string;
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const data: RequestData = await request.json();

    if (!data.companyName || !data.registrationId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, registrationId' },
        { status: 400 }
      );
    }

    // Generate invoice number if not provided
    const invoiceNumber = data.invoiceNumber || generateInvoiceNumber({
      type: 'rendezvous',
      registrationId: data.registrationId,
    });

    // Prepare data for the PDF generator
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
      forceCurrency: data.forceCurrency,
      vatNumber: data.vatNumber,
    };

    // Generate the PDF
    const result = await generateRendezvousInvoicePDF(invoiceData);

    // Upload to storage using shared service
    const { signedUrl } = await uploadInvoicePDF({
      pdfBase64: result.pdfBase64,
      invoiceNumber,
      organizationName: data.companyName,
      folder: 'rendezvous-invoices',
      metadata: {
        registrationId: data.registrationId,
        regeneratedAt: new Date().toISOString(),
      },
    });

    // Update the registration with the new invoice URL
    const registrationsRef = adminDb.collection('rendezvous-registrations');
    const snapshot = await registrationsRef
      .where('registrationId', '==', data.registrationId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        invoiceUrl: signedUrl,
        invoiceNumber: invoiceNumber,
        invoiceRegeneratedAt: FieldValue.serverTimestamp(),
        // Also update pricing fields so they persist
        totalPrice: data.totalPrice,
        subtotal: data.subtotal,
        numberOfAttendees: data.numberOfTickets,
        discount: data.discount,
        companyIsFaseMember: data.isFaseMember,
        isAsaseMember: data.isAsaseMember,
        ...(data.vatNumber && { 'billingInfo.vatNumber': data.vatNumber }),
      });
    }

    return NextResponse.json({
      success: true,
      pdfBase64: result.pdfBase64,
      invoiceNumber: invoiceNumber,
      invoiceUrl: signedUrl,
      filename: `${invoiceNumber}.pdf`,
    });
  } catch (error: any) {
    console.error('Error regenerating rendezvous invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate invoice' },
      { status: 500 }
    );
  }
}
