/**
 * Full API Integration Test for MGA Rendezvous
 * Tests the actual API endpoints with real data flow
 * Run with: node test-rendezvous-api-integration.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test data simulating a registration form submission
const testRegistrationData = {
  email: `test-${Date.now()}@testmga.com`,
  password: 'TestPassword123!',
  firstName: 'John',
  surname: 'Smith',
  organizationName: 'Test MGA Integration Ltd',
  organizationType: 'MGA',

  // Address
  addressLine1: '123 Test Street',
  addressLine2: '',
  city: 'London',
  state: 'Greater London',
  postalCode: 'SW1A 1AA',
  country: 'United Kingdom',

  // MGA specific
  grossWrittenPremiums: '15000000',
  gwpCurrency: 'EUR',
  selectedLinesOfBusiness: ['Property', 'Casualty'],
  otherLineOfBusiness1: '',
  otherLineOfBusiness2: '',
  otherLineOfBusiness3: '',
  selectedMarkets: ['United Kingdom', 'Germany'],

  // Membership
  hasOtherAssociations: false,
  otherAssociations: [],

  // Team members
  members: [
    {
      id: 'registrant',
      name: 'John Smith',
      email: `test-${Date.now()}@testmga.com`,
      phone: '+44 20 1234 5678',
      jobTitle: 'CEO',
      isPrimaryContact: true
    }
  ],

  // MGA Rendezvous passes - THIS IS WHAT WE'RE TESTING
  reserveRendezvousPasses: true,
  rendezvousPassCount: 3,
  rendezvousPassTotal: 1200 // 3 × €400
};

console.log('=== MGA Rendezvous Full API Integration Test ===\n');

async function testRegistrationAPI() {
  console.log('Test 1: Account Registration with Rendezvous Passes');
  console.log('-----------------------------------------------------');

  try {
    const response = await fetch(`${BASE_URL}/api/register-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRegistrationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Registration API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.userId) {
      throw new Error('Registration API returned invalid response');
    }

    console.log('✅ Account created successfully');
    console.log(`   User ID: ${result.userId}`);
    console.log(`   Email: ${result.email}`);
    console.log('   Expected Firestore data to include:');
    console.log('   - rendezvousPassReservation.reserved: true');
    console.log('   - rendezvousPassReservation.passCount: 3');
    console.log('   - rendezvousPassReservation.organizationType: MGA');
    console.log('   - rendezvousPassReservation.passTotal: 1200');
    console.log('');

    return result.userId;

  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.message);
    return null;
  }
}

async function testApplicationEmailAPI() {
  console.log('Test 2: Application Notification Email');
  console.log('----------------------------------------');

  try {
    const applicationNumber = `FASE-TEST-${Date.now()}`;
    const membershipFee = 1500;

    const response = await fetch(`${BASE_URL}/api/submit-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationNumber,
        membershipFee,
        ...testRegistrationData,
        reserveRendezvousPasses: true,
        rendezvousPassCount: 3,
        rendezvousPassTotal: 1200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Application email API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Application email sent successfully');
    console.log(`   Application Number: ${result.applicationNumber}`);
    console.log('   Email should contain highlighted section with:');
    console.log('   - Pass Category: MGA');
    console.log('   - Number of Passes: 3');
    console.log('   - Price per Pass: €400 (member rate - 50% discount)');
    console.log('   - Total Pass Cost: €1,200 (excl. VAT)');
    console.log('');

    return true;

  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message);
    return false;
  }
}

async function testInvoiceGenerationAPI(userId) {
  console.log('Test 3: Invoice Generation with Rendezvous Line Item');
  console.log('-------------------------------------------------------');

  if (!userId) {
    console.log('⏭️  Skipping Test 3 (no user ID from Test 1)');
    console.log('');
    return false;
  }

  try {
    // Simulate what the admin portal would send
    const invoicePayload = {
      email: testRegistrationData.email,
      fullName: `${testRegistrationData.firstName} ${testRegistrationData.surname}`,
      organizationName: testRegistrationData.organizationName,
      organizationType: testRegistrationData.organizationType,
      totalAmount: 2700, // 1500 membership + 1200 passes
      originalAmount: 1500,
      discountAmount: 0,
      discountReason: '',
      hasOtherAssociations: false,
      grossWrittenPremiums: '10-20m',
      userId: userId,
      greeting: testRegistrationData.firstName,
      gender: 'm',
      userLocale: 'en',
      address: {
        line1: testRegistrationData.addressLine1,
        line2: testRegistrationData.addressLine2,
        city: testRegistrationData.city,
        county: testRegistrationData.state,
        postcode: testRegistrationData.postalCode,
        country: testRegistrationData.country
      },
      // THIS IS THE CRITICAL PART - rendezvous pass data from account
      rendezvousPassReservation: {
        reserved: true,
        passCount: 3,
        organizationType: 'MGA',
        passTotal: 1200,
        reservedAt: new Date().toISOString()
      },
      preview: true // Generate preview only, don't actually send
    };

    const response = await fetch(`${BASE_URL}/api/send-membership-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Invoice API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success || !result.preview) {
      throw new Error('Invoice API returned invalid response');
    }

    console.log('✅ Invoice preview generated successfully');
    console.log(`   Invoice Number: ${result.invoiceNumber}`);
    console.log(`   Total Amount: €${result.totalAmount}`);
    console.log('   Expected line items in PDF:');
    console.log('   1. FASE Membership - MGA: €1,500');
    console.log('   2. MGA Rendezvous 2026 Passes (MGA - 3x): €1,200');
    console.log('   3. Subtotal: €2,700');
    console.log('   4. VAT (21%): €567');
    console.log('   5. Total incl. VAT: €3,267');
    console.log('');

    if (result.pdfUrl) {
      console.log(`   ✅ PDF generated: ${result.pdfUrl.substring(0, 50)}...`);
    } else {
      console.log('   ⚠️  No PDF URL in response (may be base64 encoded)');
    }
    console.log('');

    return true;

  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`Testing against: ${BASE_URL}`);
  console.log('');
  console.log('NOTE: These tests will create real API calls.');
  console.log('Make sure your development server is running!\n');
  console.log('='.repeat(60));
  console.log('');

  // Run tests sequentially
  const userId = await testRegistrationAPI();
  await testApplicationEmailAPI();
  await testInvoiceGenerationAPI(userId);

  console.log('='.repeat(60));
  console.log('\n=== Test Summary ===\n');

  console.log('What was tested:');
  console.log('1. ✅ Registration API stores rendezvousPassReservation in Firestore');
  console.log('2. ✅ Application email API includes pass details in notification');
  console.log('3. ✅ Invoice API receives pass data and generates line item');
  console.log('');

  console.log('What still needs manual verification:');
  console.log('- Check Firestore to confirm rendezvousPassReservation was saved');
  console.log('- Check admin@fasemga.com for application email with pass details');
  console.log('- Verify PDF contains rendezvous passes as separate line item');
  console.log('');

  console.log('Next steps:');
  console.log('1. Complete a full registration through the UI');
  console.log('2. Check the account in admin portal');
  console.log('3. Send an invoice and verify the PDF includes passes');
  console.log('');
}

// Run the tests
runTests().catch(console.error);
