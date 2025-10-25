// Test script for invoice email functionality
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase config (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Test invoice data
const testInvoiceData = {
  email: 'test@example.com',
  invoiceHTML: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">FEDERATION OF EUROPEAN MGAS</div>
            <div class="tagline">Professional Association for Managing General Agents</div>
        </div>
        
        <h2>Test Invoice</h2>
        <p>This is a test invoice to verify email functionality.</p>
        <p><strong>Invoice Number:</strong> TEST-12345</p>
        <p><strong>Amount:</strong> €1,500</p>
        <p><strong>Organization:</strong> Test Company Ltd</p>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 40px;">
            <h3>Payment Instructions:</h3>
            <p>This is a test email - no payment required.</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Test email from FASE invoice system</p>
        </div>
    </body>
    </html>
  `,
  invoiceNumber: 'TEST-12345',
  organizationName: 'Test Company Ltd',
  totalAmount: 1500
};

async function testInvoiceEmail() {
  try {
    console.log('Testing invoice email function...');
    console.log('Invoice data:', {
      email: testInvoiceData.email,
      invoiceNumber: testInvoiceData.invoiceNumber,
      organizationName: testInvoiceData.organizationName,
      totalAmount: testInvoiceData.totalAmount
    });
    
    const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
    const result = await sendInvoiceEmail(testInvoiceData);
    
    console.log('✅ Invoice email function executed successfully');
    console.log('Result:', result.data);
    
    if (result.data.success) {
      console.log('✅ Email sent successfully');
    } else {
      console.log('❌ Email sending failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing invoice email:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

// Run the test
testInvoiceEmail();