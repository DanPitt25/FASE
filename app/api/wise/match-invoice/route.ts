import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue, Timestamp } from '../../../../lib/firebase-admin';
import { logPaymentReceived, logInvoicePaid } from '../../../../lib/activity-logger';
import { calculateRendezvousTotal } from '../../../../lib/pricing';

// Process Rendezvous registration when bundled invoice is paid via Wise
const processRendezvousRegistration = async (
  invoiceData: any,
  wiseReference: string
) => {
  const passData = invoiceData.rendezvousPassReservation;
  if (!passData || !passData.reserved) {
    return null;
  }

  try {
    const registrationId = `membership_wise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attendees = passData.attendees || [];
    const passCount = passData.passCount || attendees.length || 1;
    const organizationType = passData.organizationType || 'MGA';
    const isFaseMember = passData.isFaseMember !== false;
    const isAsaseMember = passData.isAsaseMember || false;

    const rendezvousTotal = calculateRendezvousTotal(
      organizationType,
      passCount,
      isFaseMember,
      isAsaseMember
    ).subtotal;

    const registrationRecord = {
      registrationId,
      billingInfo: {
        company: invoiceData.accountName || invoiceData.organizationName,
        billingEmail: invoiceData.recipientEmail,
        country: invoiceData.address?.country || '',
        organizationType,
      },
      attendees: attendees.map((att: any, i: number) => ({
        id: `att_${i}`,
        firstName: att.firstName || att.name?.split(' ')[0] || '',
        lastName: att.lastName || att.name?.split(' ').slice(1).join(' ') || '',
        email: att.email || '',
        jobTitle: att.jobTitle || att.title || '',
      })),
      additionalInfo: {
        specialRequests: passData.specialRequests || '',
        linkedInvoice: invoiceData.invoiceNumber,
      },
      totalPrice: rendezvousTotal,
      subtotal: rendezvousTotal,
      vatAmount: 0,
      vatRate: 0,
      currency: 'EUR',
      numberOfAttendees: passCount,
      companyIsFaseMember: isFaseMember,
      isAsaseMember,
      membershipType: isAsaseMember ? 'asase' : (isFaseMember ? 'fase' : 'none'),
      discount: 0,
      paymentMethod: 'wise',
      paymentStatus: 'paid',
      wiseReference,
      createdAt: new Date(),
      status: 'confirmed',
      source: 'membership-invoice-bundled-wise',
      accountId: invoiceData.accountId,
    };

    await adminDb.collection('rendezvous-registrations').doc(registrationId).set(registrationRecord);
    console.log(`✅ Rendezvous registration created from Wise payment: ${registrationId}`);

    // Send confirmation email
    try {
      const emailData = {
        email: invoiceData.recipientEmail,
        cc: 'admin@fasemga.com',
        subject: `MGA Rendezvous 2026 - Registration Confirmed (${registrationId})`,
        invoiceHTML: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://mgarendezvous.com/mga-rendezvous-logo.png" alt="MGA Rendezvous" style="max-width: 200px;">
            </div>
            <h2 style="color: #2D5574;">Registration Confirmed</h2>
            <p>Your MGA Rendezvous 2026 registration has been confirmed following your bank transfer payment.</p>
            <p><strong>Registration ID:</strong> ${registrationId}</p>
            <p><strong>Company:</strong> ${invoiceData.accountName}</p>
            <p><strong>Number of Attendees:</strong> ${passCount}</p>
            <p><strong>Linked Invoice:</strong> ${invoiceData.invoiceNumber}</p>
            <p>We look forward to seeing you at MGA Rendezvous 2026!</p>
            <p>Best regards,<br>The FASE Team</p>
          </div>
        `,
        invoiceNumber: registrationId,
        organizationName: invoiceData.accountName,
        totalAmount: rendezvousTotal.toString(),
      };

      await fetch('https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: emailData }),
      });
      console.log('✅ Rendezvous confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send rendezvous confirmation email:', emailError);
    }

    return registrationId;
  } catch (error) {
    console.error('❌ Failed to create rendezvous registration:', error);
    return null;
  }
};

export const dynamic = 'force-dynamic';

/**
 * POST: Match a Wise transfer to an invoice
 * Body: { invoiceId, wiseReference, amount, currency, senderName, transactionDate }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, wiseReference, amount, currency, senderName, transactionDate } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Get the invoice
    const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceData = invoiceDoc.data();

    if (invoiceData?.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already marked as paid' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      status: 'paid',
      paymentMethod: 'wise',
      wiseReference: wiseReference || null,
      paidAt: transactionDate
        ? Timestamp.fromDate(new Date(transactionDate))
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Process bundled Rendezvous registration if present
    let rendezvousRegistrationId: string | null = null;
    if (invoiceData?.rendezvousPassReservation) {
      rendezvousRegistrationId = await processRendezvousRegistration(
        invoiceData,
        wiseReference || `manual_${Date.now()}`
      );
      if (rendezvousRegistrationId) {
        updateData.linkedRendezvousRegistration = rendezvousRegistrationId;
      }
    }

    // Update the invoice
    await invoiceRef.update(updateData);

    // Log activity if we have an account ID
    if (invoiceData?.accountId) {
      await logPaymentReceived(
        invoiceData.accountId,
        amount || invoiceData.amount,
        currency || invoiceData.currency,
        'wise',
        invoiceId
      );

      await logInvoicePaid(
        invoiceData.accountId,
        invoiceData.invoiceNumber,
        amount || invoiceData.amount,
        currency || invoiceData.currency,
        invoiceId,
        'Wise Transfer'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice matched and marked as paid',
      invoice: {
        id: invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber,
        status: 'paid',
        paymentMethod: 'wise',
        wiseReference,
      },
      rendezvousRegistrationId,
    });
  } catch (error: any) {
    console.error('Error matching Wise transfer to invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to match transfer' },
      { status: 500 }
    );
  }
}

/**
 * GET: Auto-match all unmatched transfers to invoices
 *
 * Query params:
 * - autoMark=true: Automatically mark high-confidence matches as paid
 * - dryRun=true: Just return matches without marking (default behavior)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const autoMark = searchParams.get('autoMark') === 'true';
    const dryRun = searchParams.get('dryRun') !== 'false'; // Default to dry run unless explicitly false

    // Get all unpaid invoices
    const unpaidInvoices = await adminDb
      .collection('invoices')
      .where('status', '!=', 'paid')
      .get();

    const invoiceMap = new Map<string, any>();
    unpaidInvoices.docs.forEach((doc) => {
      const data = doc.data();
      invoiceMap.set(data.invoiceNumber?.toUpperCase(), {
        id: doc.id,
        ...data,
      });
    });

    // Get Wise transactions
    const { getWiseClient } = await import('../../../../lib/wise-api');
    const wiseClient = getWiseClient();
    const wiseResult = await wiseClient.getIncomingPayments();
    const transactions = wiseResult.transactions;

    const matches: any[] = [];
    const unmatched: any[] = [];
    const autoMarked: any[] = [];
    const errors: any[] = [];

    for (const transaction of transactions) {
      const reference = (
        transaction.details.paymentReference ||
        transaction.details.description ||
        ''
      ).toUpperCase();

      let matched = false;

      // Try to find a matching invoice by invoice number in reference
      for (const [invoiceNumber, invoice] of Array.from(invoiceMap.entries())) {
        if (reference.includes(invoiceNumber)) {
          const matchData = {
            transaction: {
              referenceNumber: transaction.referenceNumber,
              date: transaction.date,
              amount: transaction.amount.value,
              currency: transaction.amount.currency,
              senderName: transaction.details.senderName,
              paymentReference: transaction.details.paymentReference,
            },
            invoice: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount || invoice.total,
              currency: invoice.currency || invoice.paymentCurrency,
              organizationName: invoice.organizationName || invoice.accountName,
              accountId: invoice.accountId,
            },
            confidence: 'high',
          };

          // If autoMark is enabled and not a dry run, mark the invoice as paid
          if (autoMark && !dryRun) {
            try {
              const invoiceRef = adminDb.collection('invoices').doc(invoice.id);

              const updateData: Record<string, any> = {
                status: 'paid',
                paymentMethod: 'wise',
                wiseReference: transaction.referenceNumber,
                paidAt: transaction.date
                  ? Timestamp.fromDate(new Date(transaction.date))
                  : FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              };

              // Process bundled Rendezvous registration if present
              if (invoice.rendezvousPassReservation) {
                const rendezvousRegId = await processRendezvousRegistration(
                  invoice,
                  transaction.referenceNumber
                );
                if (rendezvousRegId) {
                  updateData.linkedRendezvousRegistration = rendezvousRegId;
                }
              }

              await invoiceRef.update(updateData);

              // Log activity
              if (invoice.accountId) {
                await logPaymentReceived(
                  invoice.accountId,
                  transaction.amount.value,
                  transaction.amount.currency,
                  'wise',
                  invoice.id
                );

                await logInvoicePaid(
                  invoice.accountId,
                  invoice.invoiceNumber,
                  transaction.amount.value,
                  transaction.amount.currency,
                  invoice.id,
                  'Wise Transfer (Auto-matched)'
                );
              }

              autoMarked.push({
                ...matchData,
                action: 'marked_paid',
                rendezvousRegistrationCreated: !!invoice.rendezvousPassReservation,
              });

              // Remove from map so we don't match again
              invoiceMap.delete(invoiceNumber);
            } catch (markError: any) {
              errors.push({
                invoiceNumber: invoice.invoiceNumber,
                error: markError.message,
              });
              matches.push(matchData);
            }
          } else {
            matches.push(matchData);
          }

          matched = true;
          break;
        }
      }

      if (!matched) {
        unmatched.push({
          referenceNumber: transaction.referenceNumber,
          date: transaction.date,
          amount: transaction.amount.value,
          currency: transaction.amount.currency,
          senderName: transaction.details.senderName,
          paymentReference: transaction.details.paymentReference,
          description: transaction.details.description,
        });
      }
    }

    return NextResponse.json({
      success: true,
      matches,
      unmatched,
      autoMarked: autoMark ? autoMarked : undefined,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalTransactions: transactions.length,
        matchedCount: matches.length + autoMarked.length,
        autoMarkedCount: autoMarked.length,
        unmatchedCount: unmatched.length,
        unpaidInvoicesCount: unpaidInvoices.size,
        errorsCount: errors.length,
      },
      mode: dryRun ? 'dry_run' : 'live',
    });
  } catch (error: any) {
    console.error('Error auto-matching Wise transfers:', error);

    if (error.message?.includes('environment variable')) {
      return NextResponse.json(
        {
          error: 'Wise API not configured',
          details: error.message,
          configured: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to auto-match transfers' },
      { status: 500 }
    );
  }
}
