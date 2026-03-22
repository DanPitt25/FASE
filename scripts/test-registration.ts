/**
 * Registration Form Test Script
 *
 * Tests all registration paths by calling the API directly.
 * Run with: npx ts-node scripts/test-registration.ts
 *
 * Options:
 *   --single      Run only one test (for quick verification)
 *
 * IMPORTANT: This creates REAL accounts in Firebase.
 * Test emails go to daniel.pitt@fasemga.com with [TEST] prefix.
 * Clean up test accounts in Firebase after testing.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SINGLE_TEST = process.argv.includes('--single');
const TEST_EMAIL_RECIPIENT = 'daniel.pitt@fasemga.com';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

// Helper to generate unique test emails
const uniqueEmail = (prefix: string) => `test-${prefix}-${Date.now()}@test-fase-registration.com`;

// Base valid MGA payload
const validMGAPayload = () => ({
  email: uniqueEmail('mga'),
  password: 'TestPass123!',
  firstName: 'Test',
  surname: 'MGA',
  organizationName: `Test MGA ${Date.now()}`,
  organizationType: 'MGA',
  members: [{
    id: 'registrant',
    firstName: 'Test',
    lastName: 'MGA',
    name: 'Test MGA',
    email: uniqueEmail('mga-member'),
    phone: '+1234567890',
    jobTitle: 'CEO',
    isPrimaryContact: true
  }],
  addressLine1: '123 Test Street',
  addressLine2: '',
  city: 'Test City',
  state: 'Test State',
  postalCode: '12345',
  country: 'Germany',
  grossWrittenPremiums: '15000000', // €15m = 10-20m band
  gwpCurrency: 'EUR',
  selectedLinesOfBusiness: ['property_commercial', 'casualty'],
  otherLineOfBusiness1: '',
  otherLineOfBusiness2: '',
  otherLineOfBusiness3: '',
  selectedMarkets: ['DE', 'FR'],
  hasOtherAssociations: false,
  otherAssociations: [],
  servicesProvided: [],
  status: 'pending'
});

// Base valid Carrier payload
const validCarrierPayload = () => ({
  email: uniqueEmail('carrier'),
  password: 'TestPass123!',
  firstName: 'Test',
  surname: 'Carrier',
  organizationName: `Test Carrier ${Date.now()}`,
  organizationType: 'carrier',
  members: [{
    id: 'registrant',
    firstName: 'Test',
    lastName: 'Carrier',
    name: 'Test Carrier',
    email: uniqueEmail('carrier-member'),
    phone: '+1234567890',
    jobTitle: 'Underwriting Director',
    isPrimaryContact: true
  }],
  addressLine1: '456 Insurance Ave',
  addressLine2: 'Floor 10',
  city: 'London',
  state: '',
  postalCode: 'EC1A 1BB',
  country: 'United Kingdom',
  grossWrittenPremiums: '0',
  gwpCurrency: 'EUR',
  selectedLinesOfBusiness: [],
  otherLineOfBusiness1: '',
  otherLineOfBusiness2: '',
  otherLineOfBusiness3: '',
  selectedMarkets: [],
  hasOtherAssociations: false,
  otherAssociations: [],
  servicesProvided: [],
  carrierOrganizationType: 'insurance_company',
  isDelegatingInEurope: 'Yes',
  numberOfMGAs: '6-10',
  delegatingCountries: ['DE', 'FR', 'ES'],
  frontingOptions: 'hybrid',
  considerStartupMGAs: 'Yes',
  amBestRating: 'A',
  otherRating: '',
  status: 'pending'
});

// Base valid Provider payload
const validProviderPayload = () => ({
  email: uniqueEmail('provider'),
  password: 'TestPass123!',
  firstName: 'Test',
  surname: 'Provider',
  organizationName: `Test Provider ${Date.now()}`,
  organizationType: 'provider',
  members: [{
    id: 'registrant',
    firstName: 'Test',
    lastName: 'Provider',
    name: 'Test Provider',
    email: uniqueEmail('provider-member'),
    phone: '+1234567890',
    jobTitle: 'Managing Director',
    isPrimaryContact: true
  }],
  addressLine1: '789 Service Road',
  addressLine2: '',
  city: 'Paris',
  state: '',
  postalCode: '75001',
  country: 'France',
  grossWrittenPremiums: '0',
  gwpCurrency: 'EUR',
  selectedLinesOfBusiness: [],
  otherLineOfBusiness1: '',
  otherLineOfBusiness2: '',
  otherLineOfBusiness3: '',
  selectedMarkets: [],
  hasOtherAssociations: true,
  otherAssociations: ['ASASE'],
  servicesProvided: ['actuarial', 'claims', 'consulting'],
  status: 'pending'
});

// API call helpers
async function callRegisterAPI(payload: any): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const response = await fetch(`${BASE_URL}/api/register-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    return { ok: false, status: 0, data: { error: error.message } };
  }
}

// Full registration (single API - creates account and sends notification email)
async function fullRegistration(payload: any, testName: string): Promise<{ ok: boolean; error?: string }> {
  const testPayload = {
    ...payload,
    _testMode: true,
    _testName: testName,
    _testEmailOverride: TEST_EMAIL_RECIPIENT
  };
  const result = await callRegisterAPI(testPayload);
  if (!result.ok) {
    return { ok: false, error: result.data.error };
  }
  return { ok: true };
}

// Test runner
async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// ============== TESTS ==============

async function testMGABasicRegistration() {
  const payload = validMGAPayload();
  const result = await fullRegistration(payload, 'MGA Basic Registration - expect fee €1500');
  if (!result.ok) throw new Error(result.error);
}

async function testCarrierBasicRegistration() {
  const payload = validCarrierPayload();
  const result = await fullRegistration(payload, 'Carrier Basic Registration - expect fee €4000');
  if (!result.ok) throw new Error(result.error);
}

async function testProviderBasicRegistration() {
  const payload = validProviderPayload();
  const result = await fullRegistration(payload, 'Provider Basic Registration - expect fee €5000');
  if (!result.ok) throw new Error(result.error);
}

async function testMGAWithRendezvousPasses() {
  const payload = {
    ...validMGAPayload(),
    reserveRendezvousPasses: true,
    rendezvousPassCount: 2,
    rendezvousPassSubtotal: 800, // 2 x €400
    rendezvousPassTotal: 800,
    rendezvousIsAsaseMember: false,
    rendezvousAttendees: [
      { id: 'att_0', firstName: 'John', lastName: 'Doe', email: 'john@test.com', jobTitle: 'CEO' },
      { id: 'att_1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', jobTitle: 'COO' }
    ]
  };

  const result = await fullRegistration(payload, 'MGA with Rendezvous - expect 2 passes @ €400 = €800');
  if (!result.ok) throw new Error(result.error);
}

async function testProviderASASEMemberWithFreePasses() {
  const payload = {
    ...validProviderPayload(),
    hasOtherAssociations: true,
    otherAssociations: ['ASASE'],
    reserveRendezvousPasses: true,
    rendezvousPassCount: 3,
    rendezvousPassSubtotal: 0, // Free for ASASE
    rendezvousPassTotal: 0,
    rendezvousIsAsaseMember: true,
    rendezvousAttendees: [
      { id: 'att_0', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', jobTitle: 'Partner' },
      { id: 'att_1', firstName: 'Bob', lastName: 'Smith', email: 'bob@test.com', jobTitle: 'Director' },
      { id: 'att_2', firstName: 'Carol', lastName: 'Smith', email: 'carol@test.com', jobTitle: 'Manager' }
    ]
  };

  const result = await fullRegistration(payload, 'Provider ASASE - expect fee €4000 (20% off), 3 FREE passes');
  if (!result.ok) throw new Error(result.error);
}

async function testCarrierBrokerType() {
  const payload = {
    ...validCarrierPayload(),
    carrierOrganizationType: 'insurance_broker',
    isDelegatingInEurope: '',
    numberOfMGAs: '',
    delegatingCountries: [],
    frontingOptions: '',
    considerStartupMGAs: ''
  };

  const result = await fullRegistration(payload, 'Carrier Broker Type - expect fee €4000, no delegation fields');
  if (!result.ok) throw new Error(result.error);
}

async function testMGAWithMultipleTeamMembers() {
  const payload = validMGAPayload();
  payload.members = [
    {
      id: 'registrant',
      firstName: 'Primary',
      lastName: 'Contact',
      name: 'Primary Contact',
      email: uniqueEmail('primary'),
      phone: '+1111111111',
      jobTitle: 'CEO',
      isPrimaryContact: true
    },
    {
      id: 'member2',
      firstName: 'Second',
      lastName: 'Member',
      name: 'Second Member',
      email: uniqueEmail('second'),
      phone: '+2222222222',
      jobTitle: 'CFO',
      isPrimaryContact: false
    },
    {
      id: 'member3',
      firstName: 'Third',
      lastName: 'Member',
      name: 'Third Member',
      email: uniqueEmail('third'),
      phone: '+3333333333',
      jobTitle: 'COO',
      isPrimaryContact: false
    }
  ];

  const result = await fullRegistration(payload, 'MGA Multiple Team - expect 3 members listed');
  if (!result.ok) throw new Error(result.error);
}

async function testMGASmallGWP() {
  const payload = validMGAPayload();
  payload.grossWrittenPremiums = '5000000'; // €5m = <10m band = €900

  const result = await fullRegistration(payload, 'MGA Small GWP €5m - expect fee €900');
  if (!result.ok) throw new Error(result.error);
}

async function testMGALargeGWP() {
  const payload = validMGAPayload();
  payload.grossWrittenPremiums = '750000000'; // €750m = 500m+ band = €7000

  const result = await fullRegistration(payload, 'MGA Large GWP €750m - expect fee €7000');
  if (!result.ok) throw new Error(result.error);
}

async function testMGAWithGBPCurrency() {
  const payload = validMGAPayload();
  payload.grossWrittenPremiums = '10000000'; // £10m
  payload.gwpCurrency = 'GBP';

  const result = await fullRegistration(payload, 'MGA GBP £10m - expect ~€11.4m band = fee €1500');
  if (!result.ok) throw new Error(result.error);
}

async function testMGAWithDiscount() {
  const payload = validMGAPayload();
  payload.hasOtherAssociations = true;
  payload.otherAssociations = ['MGAA', 'BAUA'];

  const result = await fullRegistration(payload, 'MGA with MGAA+BAUA - expect fee €1200 (20% off €1500)');
  if (!result.ok) throw new Error(result.error);
}

// ============== ERROR CASES ==============

async function testMissingEmail() {
  const payload = validMGAPayload();
  delete (payload as any).email;

  const result = await callRegisterAPI(payload);
  if (result.ok) throw new Error('Should have failed without email');
  if (result.status !== 400) throw new Error(`Expected 400, got ${result.status}`);
}

async function testMissingPassword() {
  const payload = validMGAPayload();
  delete (payload as any).password;

  const result = await callRegisterAPI(payload);
  if (result.ok) throw new Error('Should have failed without password');
  if (result.status !== 400) throw new Error(`Expected 400, got ${result.status}`);
}

async function testMissingPrimaryContact() {
  const payload = validMGAPayload();
  payload.members[0].isPrimaryContact = false;

  const result = await callRegisterAPI(payload);
  if (result.ok) throw new Error('Should have failed without primary contact');
}

async function testWeakPassword() {
  const payload = validMGAPayload();
  payload.password = '123';

  const result = await callRegisterAPI(payload);
  if (result.ok) throw new Error('Should have failed with weak password');
}

async function testDuplicateEmail() {
  const payload1 = validMGAPayload();
  const email = uniqueEmail('duplicate');
  payload1.email = email;

  const result1 = await callRegisterAPI(payload1);
  if (!result1.ok) throw new Error(`First registration failed: ${result1.data.error}`);

  const payload2 = validMGAPayload();
  payload2.email = email;

  const result2 = await callRegisterAPI(payload2);
  if (result2.ok) throw new Error('Should have failed with duplicate email');
  if (!result2.data.error.includes('already registered')) {
    throw new Error(`Expected 'already registered' error, got: ${result2.data.error}`);
  }
}

// ============== MAIN ==============

async function main() {
  console.log('\n🧪 FASE Registration API Tests\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  console.log('─'.repeat(50));

  if (SINGLE_TEST) {
    // Quick single test
    console.log('\n📋 SINGLE TEST MODE\n');
    await runTest('MGA Basic Registration', testMGABasicRegistration);
  } else {
    // Full test suite
    console.log('\n📋 SUCCESS CASES\n');
    await runTest('MGA Basic Registration', testMGABasicRegistration);
    await runTest('Carrier Basic Registration', testCarrierBasicRegistration);
    await runTest('Provider Basic Registration', testProviderBasicRegistration);
    await runTest('MGA with Rendezvous Passes', testMGAWithRendezvousPasses);
    await runTest('Provider ASASE Member (Free Passes)', testProviderASASEMemberWithFreePasses);
    await runTest('Carrier Broker Type (No Delegation)', testCarrierBrokerType);
    await runTest('MGA with Multiple Team Members', testMGAWithMultipleTeamMembers);
    await runTest('MGA Small GWP (<€10m)', testMGASmallGWP);
    await runTest('MGA Large GWP (€500m+)', testMGALargeGWP);
    await runTest('MGA with GBP Currency', testMGAWithGBPCurrency);
    await runTest('MGA with Association Discount', testMGAWithDiscount);

    console.log('\n📋 ERROR CASES\n');
    await runTest('Missing Email (should fail)', testMissingEmail);
    await runTest('Missing Password (should fail)', testMissingPassword);
    await runTest('Missing Primary Contact (should fail)', testMissingPrimaryContact);
    await runTest('Weak Password (should fail)', testWeakPassword);
    await runTest('Duplicate Email (should fail)', testDuplicateEmail);
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
  }

  console.log('\n⚠️  Remember to clean up test accounts in Firebase!\n');
}

main().catch(console.error);
