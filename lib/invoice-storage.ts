import { getAdminStorage } from './firebase-admin';

/**
 * Upload an invoice PDF to Firebase Storage (server-side)
 * @param pdfBase64 - The PDF file as base64 string
 * @param invoiceNumber - The invoice number for naming
 * @param organizationName - The organization name for folder structure
 * @returns Promise with download URL and file path
 */
export async function uploadInvoicePDF(
  pdfBase64: string,
  invoiceNumber: string,
  organizationName: string
): Promise<{ downloadURL: string; filePath: string }> {
  const storage = getAdminStorage();

  // Sanitize organization name for folder path
  const sanitizedOrgName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Create file path
  const fileName = `${invoiceNumber}.pdf`;
  const filePath = `invoices/${sanitizedOrgName}/${fileName}`;

  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    // Convert base64 to Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Upload the file
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          invoiceNumber,
          organizationName,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Make the file publicly accessible and get URL
    await file.makePublic();
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    console.log(`✅ Invoice PDF uploaded: ${filePath}`);

    return {
      downloadURL,
      filePath
    };
  } catch (error) {
    console.error('Error uploading invoice PDF:', error);
    throw new Error('Failed to upload invoice PDF.');
  }
}

