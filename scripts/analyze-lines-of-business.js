/**
 * READ-ONLY Analysis Script for Lines of Business Data
 * 
 * This script safely examines the current state of linesOfBusiness data
 * in the database without making any modifications.
 * 
 * Usage: node scripts/analyze-lines-of-business.js
 */

const admin = require('firebase-admin');

// Expected English keys for lines of business
const EXPECTED_ENGLISH_KEYS = [
  'accident_health',
  'aviation',
  'bloodstock',
  'casualty',
  'construction',
  'cyber',
  'energy',
  'event_cancellation',
  'fine_art_specie',
  'legal_expenses',
  'life',
  'livestock',
  'marine',
  'management_liability',
  'motor_commercial',
  'motor_personal',
  'pet',
  'political_risk',
  'professional_indemnity',
  'property_commercial',
  'property_personal',
  'surety',
  'trade_credit',
  'travel',
  'warranty_indemnity',
  'other',
  'other_2',
  'other_3'
];

// Known translations that should be converted to English keys
const TRANSLATION_MAP = {
  // French translations
  'Accident et Santé': 'accident_health',
  'Aviation': 'aviation',
  'Bloodstock': 'bloodstock',
  'Responsabilité': 'casualty',
  'Construction': 'construction',
  'Cyber': 'cyber',
  'Énergie': 'energy',
  'Annulation d\'événement': 'event_cancellation',
  'Beaux-arts et espèces': 'fine_art_specie',
  'Frais juridiques': 'legal_expenses',
  'Vie': 'life',
  'Bétail': 'livestock',
  'Marine': 'marine',
  'Responsabilité de gestion': 'management_liability',
  'Automobile commerciale': 'motor_commercial',
  'Automobile personnelle': 'motor_personal',
  'Animaux de compagnie': 'pet',
  'Risque politique': 'political_risk',
  'Indemnité professionnelle': 'professional_indemnity',
  'Propriété commerciale': 'property_commercial',
  'Propriété personnelle': 'property_personal',
  'Caution': 'surety',
  'Crédit commercial': 'trade_credit',
  'Voyage': 'travel',
  'Garantie et indemnité': 'warranty_indemnity',
  'Autre': 'other',
  'Autre 2': 'other_2',
  'Autre 3': 'other_3',
  
  // German translations
  'Unfall und Gesundheit': 'accident_health',
  'Luftfahrt': 'aviation',
  'Zuchtvieh': 'bloodstock',
  'Haftpflicht': 'casualty',
  'Bau': 'construction',
  'Cyber': 'cyber',
  'Energie': 'energy',
  'Veranstaltungsausfall': 'event_cancellation',
  'Kunstgegenstände und Wertpapiere': 'fine_art_specie',
  'Rechtskosten': 'legal_expenses',
  'Leben': 'life',
  'Vieh': 'livestock',
  'Seeversicherung': 'marine',
  'Managerhaftung': 'management_liability',
  'Kfz-Versicherung gewerblich': 'motor_commercial',
  'Kfz-Versicherung privat': 'motor_personal',
  'Haustiere': 'pet',
  'Politisches Risiko': 'political_risk',
  'Berufshaftpflicht': 'professional_indemnity',
  'Gewerbeimmobilien': 'property_commercial',
  'Privatimmobilien': 'property_personal',
  'Bürgschaft': 'surety',
  'Kreditversicherung': 'trade_credit',
  'Reise': 'travel',
  'Garantie und Entschädigung': 'warranty_indemnity',
  'Sonstige': 'other',
  'Sonstige 2': 'other_2',
  'Sonstige 3': 'other_3',
  
  // Spanish translations
  'Accidente y Salud': 'accident_health',
  'Aviación': 'aviation',
  'Ganado de cría': 'bloodstock',
  'Responsabilidad civil': 'casualty',
  'Construcción': 'construction',
  'Ciberseguridad': 'cyber',
  'Energía': 'energy',
  'Cancelación de eventos': 'event_cancellation',
  'Bellas artes y especies': 'fine_art_specie',
  'Gastos legales': 'legal_expenses',
  'Vida': 'life',
  'Ganado': 'livestock',
  'Marítimo': 'marine',
  'Responsabilidad directiva': 'management_liability',
  'Motor comercial': 'motor_commercial',
  'Motor personal': 'motor_personal',
  'Mascotas': 'pet',
  'Riesgo político': 'political_risk',
  'Indemnización profesional': 'professional_indemnity',
  'Propiedad comercial': 'property_commercial',
  'Propiedad personal': 'property_personal',
  'Fianza': 'surety',
  'Crédito comercial': 'trade_credit',
  'Viaje': 'travel',
  'Garantía e indemnización': 'warranty_indemnity',
  'Otro': 'other',
  'Otro 2': 'other_2',
  'Otro 3': 'other_3',
  
  // Italian translations
  'Incidenti e Salute': 'accident_health',
  'Aviazione': 'aviation',
  'Bestiame da riproduzione': 'bloodstock',
  'Responsabilità civile': 'casualty',
  'Costruzioni': 'construction',
  'Cyber': 'cyber',
  'Energia': 'energy',
  'Annullamento eventi': 'event_cancellation',
  'Belle arti e specie': 'fine_art_specie',
  'Spese legali': 'legal_expenses',
  'Vita': 'life',
  'Bestiame': 'livestock',
  'Marittimo': 'marine',
  'Responsabilità direttiva': 'management_liability',
  'Auto commerciale': 'motor_commercial',
  'Auto personale': 'motor_personal',
  'Animali domestici': 'pet',
  'Rischio politico': 'political_risk',
  'Indennizzo professionale': 'professional_indemnity',
  'Proprietà commerciale': 'property_commercial',
  'Proprietà personale': 'property_personal',
  'Garanzia': 'surety',
  'Credito commerciale': 'trade_credit',
  'Viaggio': 'travel',
  'Garanzia e indennizzo': 'warranty_indemnity',
  'Altro': 'other',
  'Altro 2': 'other_2',
  'Altro 3': 'other_3',
  
  // Dutch translations
  'Ongeval en Gezondheid': 'accident_health',
  'Luchtvaart': 'aviation',
  'Fokdieren': 'bloodstock',
  'Aansprakelijkheid': 'casualty',
  'Bouw': 'construction',
  'Cyber': 'cyber',
  'Energie': 'energy',
  'Evenementannulering': 'event_cancellation',
  'Beeldende kunst en waarden': 'fine_art_specie',
  'Juridische kosten': 'legal_expenses',
  'Leven': 'life',
  'Vee': 'livestock',
  'Zeevaart': 'marine',
  'Bestuurdersaansprakelijkheid': 'management_liability',
  'Motor commercieel': 'motor_commercial',
  'Motor persoonlijk': 'motor_personal',
  'Huisdieren': 'pet',
  'Politiek risico': 'political_risk',
  'Beroepsaansprakelijkheid': 'professional_indemnity',
  'Commercieel vastgoed': 'property_commercial',
  'Persoonlijk vastgoed': 'property_personal',
  'Borgstelling': 'surety',
  'Handelskredieten': 'trade_credit',
  'Reizen': 'travel',
  'Garantie en vergoeding': 'warranty_indemnity',
  'Anders': 'other',
  'Anders 2': 'other_2',
  'Anders 3': 'other_3'
};

async function initializeFirebaseAdmin() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log('✅ Firebase Admin initialized successfully');
    return admin.firestore();
  } catch (error) {
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
  }
}

async function analyzeLinesOfBusinessData() {
  console.log('🔍 Starting read-only analysis of lines of business data...\n');
  
  try {
    const db = await initializeFirebaseAdmin();
    
    // Get all accounts
    const accountsSnapshot = await db.collection('accounts').get();
    
    if (accountsSnapshot.empty) {
      console.log('❌ No accounts found in database');
      return;
    }

    console.log(`📊 Found ${accountsSnapshot.size} total accounts\n`);

    const mgaAccounts = [];
    const nonMgaAccounts = [];
    const linesOfBusinessData = new Map();
    const uniqueValues = new Set();

    // Analyze each account
    for (const accountDoc of accountsSnapshot.docs) {
      const accountData = accountDoc.data();
      
      // Check if this is an MGA with portfolio data
      if (accountData.organizationType === 'MGA' && accountData.portfolio?.linesOfBusiness) {
        mgaAccounts.push({
          id: accountDoc.id,
          organizationName: accountData.organizationName || accountData.displayName || 'Unknown',
          linesOfBusiness: accountData.portfolio.linesOfBusiness
        });
        
        // Track all unique values
        if (Array.isArray(accountData.portfolio.linesOfBusiness)) {
          accountData.portfolio.linesOfBusiness.forEach(line => {
            uniqueValues.add(line);
            if (!linesOfBusinessData.has(line)) {
              linesOfBusinessData.set(line, []);
            }
            linesOfBusinessData.get(line).push({
              accountId: accountDoc.id,
              organizationName: accountData.organizationName || accountData.displayName || 'Unknown'
            });
          });
        }
      } else {
        nonMgaAccounts.push({
          id: accountDoc.id,
          organizationName: accountData.organizationName || accountData.displayName || 'Unknown',
          organizationType: accountData.organizationType || 'Unknown'
        });
      }
    }

    // Generate analysis report
    console.log('=' .repeat(80));
    console.log('📋 LINES OF BUSINESS ANALYSIS REPORT');
    console.log('=' .repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total accounts: ${accountsSnapshot.size}`);
    console.log(`   MGA accounts with lines of business: ${mgaAccounts.length}`);
    console.log(`   Non-MGA accounts: ${nonMgaAccounts.length}`);
    console.log(`   Unique lines of business values found: ${uniqueValues.size}\n`);

    // Categorize the values
    const englishKeys = [];
    const translatedValues = [];
    const unknownValues = [];

    for (const value of uniqueValues) {
      if (EXPECTED_ENGLISH_KEYS.includes(value)) {
        englishKeys.push(value);
      } else if (TRANSLATION_MAP[value]) {
        translatedValues.push(value);
      } else {
        unknownValues.push(value);
      }
    }

    console.log('🟢 ENGLISH KEYS (CORRECT):');
    if (englishKeys.length === 0) {
      console.log('   None found! ⚠️');
    } else {
      englishKeys.forEach(key => {
        const accounts = linesOfBusinessData.get(key);
        console.log(`   ✓ ${key} (used by ${accounts.length} account(s))`);
      });
    }

    console.log('\n🟡 TRANSLATED VALUES (NEED CONVERSION):');
    if (translatedValues.length === 0) {
      console.log('   None found! ✅');
    } else {
      translatedValues.forEach(value => {
        const accounts = linesOfBusinessData.get(value);
        const englishKey = TRANSLATION_MAP[value];
        console.log(`   ⚠️  "${value}" → should be "${englishKey}" (used by ${accounts.length} account(s))`);
      });
    }

    console.log('\n🔴 UNKNOWN VALUES (NEED MANUAL REVIEW):');
    if (unknownValues.length === 0) {
      console.log('   None found! ✅');
    } else {
      unknownValues.forEach(value => {
        const accounts = linesOfBusinessData.get(value);
        console.log(`   ❓ "${value}" (used by ${accounts.length} account(s)) - needs manual mapping`);
      });
    }

    // Detailed account breakdown
    console.log('\n' + '=' .repeat(80));
    console.log('📊 DETAILED ACCOUNT BREAKDOWN');
    console.log('=' .repeat(80));

    for (const mgaAccount of mgaAccounts) {
      console.log(`\n🏢 ${mgaAccount.organizationName} (${mgaAccount.id})`);
      console.log(`   Lines of Business (${mgaAccount.linesOfBusiness.length} total):`);
      
      mgaAccount.linesOfBusiness.forEach(line => {
        if (EXPECTED_ENGLISH_KEYS.includes(line)) {
          console.log(`   ✅ ${line} (English key - OK)`);
        } else if (TRANSLATION_MAP[line]) {
          console.log(`   🔄 "${line}" → should be "${TRANSLATION_MAP[line]}"`);
        } else {
          console.log(`   ❓ "${line}" (unknown - needs manual review)`);
        }
      });
    }

    // Generate migration summary
    console.log('\n' + '=' .repeat(80));
    console.log('🔧 MIGRATION SUMMARY');
    console.log('=' .repeat(80));

    let totalAccountsNeedingUpdate = 0;
    let totalValuesNeedingUpdate = 0;

    for (const mgaAccount of mgaAccounts) {
      let accountNeedsUpdate = false;
      let accountUpdateCount = 0;
      
      mgaAccount.linesOfBusiness.forEach(line => {
        if (!EXPECTED_ENGLISH_KEYS.includes(line)) {
          accountNeedsUpdate = true;
          accountUpdateCount++;
          totalValuesNeedingUpdate++;
        }
      });
      
      if (accountNeedsUpdate) {
        totalAccountsNeedingUpdate++;
      }
    }

    console.log(`\n📋 Migration Required:`);
    console.log(`   Accounts needing updates: ${totalAccountsNeedingUpdate}/${mgaAccounts.length}`);
    console.log(`   Total values needing conversion: ${totalValuesNeedingUpdate}`);
    console.log(`   Accounts already correct: ${mgaAccounts.length - totalAccountsNeedingUpdate}`);

    if (totalAccountsNeedingUpdate === 0) {
      console.log('\n🎉 All accounts already have correct English keys! No migration needed.');
    } else {
      console.log('\n⚠️  Migration will be needed to fix translated values.');
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Analysis complete! No data was modified.');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeLinesOfBusinessData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });