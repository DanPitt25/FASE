/**
 * Activity Logger Library
 * Logs all account activities to Firestore for CRM timeline
 * Collection: accounts/{accountId}/activities
 */

import { Activity, ActivityType } from './firestore';
import { getAdminDb as getDb, FieldValue } from './firebase-admin';

export interface LogActivityOptions {
  description?: string;
  metadata?: Record<string, any>;
  performedBy?: string;
  performedByName?: string;
  relatedInvoiceId?: string;
  relatedMemberId?: string;
}

/**
 * Log an activity to an account's timeline
 */
export async function logActivity(
  accountId: string,
  type: ActivityType,
  title: string,
  options: LogActivityOptions = {}
): Promise<string> {
  const db = getDb();

  const activityRef = db.collection('accounts').doc(accountId).collection('activities').doc();

  const activity: Omit<Activity, 'id'> & { id: string } = {
    id: activityRef.id,
    accountId,
    type,
    title,
    description: options.description,
    metadata: options.metadata,
    performedBy: options.performedBy || 'system',
    performedByName: options.performedByName || 'System',
    createdAt: FieldValue.serverTimestamp(),
    relatedInvoiceId: options.relatedInvoiceId,
    relatedMemberId: options.relatedMemberId,
  };

  // Remove undefined values
  const cleanActivity = Object.fromEntries(
    Object.entries(activity).filter(([_, v]) => v !== undefined)
  );

  await activityRef.set(cleanActivity);
  return activityRef.id;
}

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

/**
 * Log when an email is sent to the account
 */
export async function logEmailSent(
  accountId: string,
  template: string,
  recipient: string,
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  return logActivity(accountId, 'email_sent', `Email sent: ${template}`, {
    description: `Sent to ${recipient}`,
    metadata: { template, recipient },
    performedBy,
    performedByName,
  });
}

/**
 * Log when account status changes
 */
export async function logStatusChange(
  accountId: string,
  oldStatus: string,
  newStatus: string,
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  return logActivity(accountId, 'status_change', `Status changed to ${formatStatus(newStatus)}`, {
    description: `Changed from ${formatStatus(oldStatus)} to ${formatStatus(newStatus)}`,
    metadata: { oldStatus, newStatus },
    performedBy,
    performedByName,
  });
}

/**
 * Log when a payment is received
 */
export async function logPaymentReceived(
  accountId: string,
  amount: number,
  currency: string,
  method: 'stripe' | 'wise' | 'bank_transfer' | 'manual',
  invoiceId?: string,
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  const methodLabel = {
    stripe: 'Stripe',
    wise: 'Wise',
    bank_transfer: 'Bank Transfer',
    manual: 'Manual',
  }[method];

  return logActivity(
    accountId,
    method === 'stripe' ? 'stripe_payment' : method === 'wise' ? 'wise_transfer' : 'payment_received',
    `Payment received: ${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    {
      description: `Via ${methodLabel}`,
      metadata: { amount, currency, method },
      relatedInvoiceId: invoiceId,
      performedBy,
      performedByName,
    }
  );
}

/**
 * Log when an invoice is sent
 */
export async function logInvoiceSent(
  accountId: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  invoiceId: string,
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  return logActivity(accountId, 'invoice_sent', `Invoice sent: ${invoiceNumber}`, {
    description: `Amount: ${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    metadata: { invoiceNumber, amount, currency },
    relatedInvoiceId: invoiceId,
    performedBy,
    performedByName,
  });
}

/**
 * Log when an invoice is paid
 */
export async function logInvoicePaid(
  accountId: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  invoiceId: string,
  paymentMethod: string
): Promise<string> {
  return logActivity(accountId, 'invoice_paid', `Invoice paid: ${invoiceNumber}`, {
    description: `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via ${paymentMethod}`,
    metadata: { invoiceNumber, amount, currency, paymentMethod },
    relatedInvoiceId: invoiceId,
    performedBy: 'system',
    performedByName: 'System',
  });
}

/**
 * Log when a note is added
 */
export async function logNoteAdded(
  accountId: string,
  notePreview: string,
  noteId: string,
  performedBy: string,
  performedByName: string
): Promise<string> {
  return logActivity(accountId, 'note_added', 'Note added', {
    description: notePreview.length > 100 ? notePreview.substring(0, 100) + '...' : notePreview,
    metadata: { noteId },
    performedBy,
    performedByName,
  });
}

/**
 * Log when a member is added to the account
 */
export async function logMemberAdded(
  accountId: string,
  memberName: string,
  memberEmail: string,
  memberId: string,
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  return logActivity(accountId, 'member_added', `Member added: ${memberName}`, {
    description: memberEmail,
    metadata: { memberName, memberEmail },
    relatedMemberId: memberId,
    performedBy,
    performedByName,
  });
}

/**
 * Log when a member is removed from the account
 */
export async function logMemberRemoved(
  accountId: string,
  memberName: string,
  memberEmail: string,
  memberId: string,
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  return logActivity(accountId, 'member_removed', `Member removed: ${memberName}`, {
    description: memberEmail,
    metadata: { memberName, memberEmail },
    relatedMemberId: memberId,
    performedBy,
    performedByName,
  });
}

/**
 * Log when a task is created
 */
export async function logTaskCreated(
  accountId: string,
  taskTitle: string,
  taskId: string,
  performedBy: string,
  performedByName: string
): Promise<string> {
  return logActivity(accountId, 'task_created', `Task created: ${taskTitle}`, {
    metadata: { taskId, taskTitle },
    performedBy,
    performedByName,
  });
}

/**
 * Log when a task is completed
 */
export async function logTaskCompleted(
  accountId: string,
  taskTitle: string,
  taskId: string,
  performedBy: string,
  performedByName: string
): Promise<string> {
  return logActivity(accountId, 'task_completed', `Task completed: ${taskTitle}`, {
    metadata: { taskId, taskTitle },
    performedBy,
    performedByName,
  });
}

/**
 * Log a Wise transfer
 */
export async function logWiseTransfer(
  accountId: string,
  amount: number,
  currency: string,
  reference: string,
  wiseTransferId: string,
  status: string,
  invoiceId?: string
): Promise<string> {
  return logActivity(accountId, 'wise_transfer', `Wise transfer: ${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, {
    description: `Reference: ${reference} | Status: ${status}`,
    metadata: { amount, currency, reference, wiseTransferId, status },
    relatedInvoiceId: invoiceId,
    performedBy: 'system',
    performedByName: 'Wise',
  });
}

/**
 * Log a Stripe payment event
 */
export async function logStripePayment(
  accountId: string,
  amount: number,
  currency: string,
  stripePaymentIntentId: string,
  status: string,
  invoiceId?: string
): Promise<string> {
  return logActivity(accountId, 'stripe_payment', `Stripe payment: ${currency.toUpperCase()} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, {
    description: `Status: ${status}`,
    metadata: { amount, currency, stripePaymentIntentId, status },
    relatedInvoiceId: invoiceId,
    performedBy: 'system',
    performedByName: 'Stripe',
  });
}

/**
 * Log bio update
 */
export async function logBioUpdated(
  accountId: string,
  action: 'submitted' | 'approved' | 'rejected',
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  const titles = {
    submitted: 'Bio submitted for review',
    approved: 'Bio approved',
    rejected: 'Bio rejected',
  };

  return logActivity(accountId, 'bio_updated', titles[action], {
    metadata: { action },
    performedBy,
    performedByName,
  });
}

/**
 * Log logo update
 */
export async function logLogoUpdated(
  accountId: string,
  action: 'submitted' | 'approved' | 'rejected',
  performedBy?: string,
  performedByName?: string
): Promise<string> {
  const titles = {
    submitted: 'Logo submitted for review',
    approved: 'Logo approved',
    rejected: 'Logo rejected',
  };

  return logActivity(accountId, 'logo_updated', titles[action], {
    metadata: { action },
    performedBy,
    performedByName,
  });
}

/**
 * Create a manual activity entry
 */
export async function logManualEntry(
  accountId: string,
  title: string,
  description: string,
  performedBy: string,
  performedByName: string
): Promise<string> {
  return logActivity(accountId, 'manual_entry', title, {
    description,
    performedBy,
    performedByName,
  });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ==========================================
// FETCH ACTIVITIES
// ==========================================

/**
 * Get activities for an account (paginated)
 */
export async function getAccountActivities(
  accountId: string,
  limit: number = 50,
  startAfter?: any
): Promise<Activity[]> {
  const db = getDb();

  let query = db
    .collection('accounts')
    .doc(accountId)
    .collection('activities')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (startAfter) {
    query = query.startAfter(startAfter);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as Activity);
}
