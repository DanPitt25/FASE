/**
 * Generate Pro MGA Solutions GmbH invoice PDF locally
 * Run with: npx ts-node scripts/generate-promga-invoice.ts
 */

import * as fs from 'fs';
import { generateInvoicePDF } from '../lib/invoice-pdf-generator';

async function main() {
  const invoiceNumber = 'FASE-' + Math.floor(10000 + Math.random() * 90000);

  console.log('Generating invoice for Pro MGA Solutions GmbH...');
  console.log('Invoice #:', invoiceNumber);
  console.log('Base fee: €1,500 (10-20m GWP band)');
  console.log('MGAA discount: -€300 (20%)');
  console.log('Total: €1,200');
  console.log('');

  const result = await generateInvoicePDF({
    invoiceNumber,
    email: 'susan.abrahams@pro-global.com',
    fullName: 'Susan Abrahams',
    organizationName: 'Pro MGA Solutions GmbH',
    organizationType: 'MGA',
    grossWrittenPremiums: '10-20m',

    // €1,500 base - €300 discount = €1,200
    totalAmount: 1200,
    originalAmount: 1500,
    discountAmount: 300,
    discountReason: 'Multi-Association Member Discount (20%)',
    hasOtherAssociations: true,

    address: {
      line1: '17 Bevis Marks',
      line2: '',
      city: 'London',
      postcode: 'EC3A 7LN',
      country: 'GB'
    },

    userLocale: 'en',
    forceCurrency: 'GBP',
    greeting: 'Susan',
    gender: 'f'
  });

  // Save PDF locally
  const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
  const filename = `Pro-MGA-Solutions-Invoice-${invoiceNumber}.pdf`;
  fs.writeFileSync(filename, pdfBuffer);

  console.log('✅ Invoice PDF generated!');
  console.log('File:', filename);
  console.log('Total (EUR):', result.totalAmount);
  if (result.convertedAmount) {
    console.log(`Total (${result.convertedCurrency}):`, result.convertedAmount);
  }
}

main().catch(console.error);
