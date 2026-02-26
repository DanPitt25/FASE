import { NextRequest, NextResponse } from 'next/server';
import { generateRendezvousInvoicePDF } from '../../../../mga-rendezvous/lib/invoice-pdf-generator';
import { adminDb, adminStorage, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

interface RegenerateInvoiceRequest {
  registrationId: string;
  invoiceNumber: string;
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
  try {
    const data: RegenerateInvoiceRequest = await request.json();

    if (!data.companyName || !data.registrationId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, registrationId' },
        { status: 400 }
      );
    }

    // Generate a new invoice number if not provided
    const invoiceNumber = data.invoiceNumber || `RDV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    // Generate the PDF using the shared generator
    const result = await generateRendezvousInvoicePDF({
      invoiceNumber,
      registrationId: data.registrationId,
      companyName: data.companyName,
      billingEmail: data.billingEmail,
      address: data.address,
      country: data.country,
      attendees: data.attendees || [],
      pricePerTicket: data.pricePerTicket,
      numberOfTickets: data.numberOfTickets,
      subtotal: data.subtotal,
      vatAmount: data.vatAmount,
      vatRate: data.vatRate || 21,
      totalPrice: data.totalPrice,
      discount: data.discount || 0,
      discountReason: data.discountReason,
      isFaseMember: data.isFaseMember || false,
      isAsaseMember: data.isAsaseMember || false,
      organizationType: data.organizationType || 'mga',
    });

    // Upload PDF to Firebase Storage
    const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
    const storagePath = `rendezvous-invoices/${invoiceNumber}.pdf`;
    const file = adminStorage.bucket().file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          invoiceNumber,
          companyName: data.companyName,
          registrationId: data.registrationId,
          regeneratedAt: new Date().toISOString(),
        },
      },
    });

    // Get the public URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '2099-12-31',
    });

    // Update the registration with the new invoice URL
    const registrationsRef = adminDb.collection('rendezvous_registrations');
    const snapshot = await registrationsRef
      .where('registrationId', '==', data.registrationId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        invoiceUrl: signedUrl,
        invoiceNumber: invoiceNumber,
        invoiceRegeneratedAt: FieldValue.serverTimestamp(),
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
