// Account ID Verification Script
// This script verifies if all Firestore accounts documents have document IDs that match their auth user IDs

import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

/**
 * Verifies if all account documents have IDs matching their uid field
 * @returns {Promise<{mismatches: Array, total: number, verified: number}>}
 */
async function verifyAccountDocumentIds() {
  try {
    console.log('🔍 Starting account ID verification...');
    
    // Get all documents from the accounts collection
    const accountsRef = collection(db, 'accounts');
    const snapshot = await getDocs(accountsRef);
    
    const results = {
      total: snapshot.size,
      verified: 0,
      mismatches: [],
      errors: []
    };
    
    console.log(`📊 Found ${results.total} account documents to verify`);
    
    // Check each document
    snapshot.docs.forEach((doc) => {
      try {
        const documentId = doc.id;
        const data = doc.data();
        const uid = data.uid;
        
        if (!uid) {
          results.errors.push({
            documentId,
            error: 'Missing uid field',
            data: data
          });
          return;
        }
        
        if (documentId === uid) {
          results.verified++;
        } else {
          results.mismatches.push({
            documentId,
            expectedId: uid,
            email: data.email || 'No email',
            displayName: data.displayName || 'No display name',
            personalName: data.personalName || 'No personal name',
            createdAt: data.createdAt?.toDate?.() || data.createdAt || 'No created date'
          });
        }
      } catch (error) {
        results.errors.push({
          documentId: doc.id,
          error: `Error processing document: ${error.message}`,
          data: null
        });
      }
    });
    
    // Generate report
    console.log('📋 VERIFICATION REPORT:');
    console.log(`✅ Total documents: ${results.total}`);
    console.log(`✅ Verified (ID matches UID): ${results.verified}`);
    console.log(`❌ Mismatches: ${results.mismatches.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}`);
    
    if (results.mismatches.length > 0) {
      console.log('\n🚨 MISMATCHED DOCUMENTS:');
      results.mismatches.forEach((mismatch, index) => {
        console.log(`${index + 1}. Document ID: ${mismatch.documentId}`);
        console.log(`   Expected ID: ${mismatch.expectedId}`);
        console.log(`   Email: ${mismatch.email}`);
        console.log(`   Display Name: ${mismatch.displayName}`);
        console.log(`   Personal Name: ${mismatch.personalName}`);
        console.log(`   Created: ${mismatch.createdAt}`);
        console.log('---');
      });
    }
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ ERRORS:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. Document ID: ${error.documentId}`);
        console.log(`   Error: ${error.error}`);
        console.log('---');
      });
    }
    
    if (results.mismatches.length === 0 && results.errors.length === 0) {
      console.log('🎉 All account documents have correct IDs!');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

/**
 * Generate a detailed CSV report of mismatches
 * @param {Array} mismatches - Array of mismatch objects
 * @returns {string} CSV content
 */
function generateMismatchReport(mismatches) {
  if (mismatches.length === 0) {
    return 'No mismatches found!';
  }
  
  const headers = ['Document ID', 'Expected UID', 'Email', 'Display Name', 'Personal Name', 'Created At'];
  const csvContent = [
    headers.join(','),
    ...mismatches.map(mismatch => [
      `"${mismatch.documentId}"`,
      `"${mismatch.expectedId}"`,
      `"${mismatch.email}"`,
      `"${mismatch.displayName}"`,
      `"${mismatch.personalName}"`,
      `"${mismatch.createdAt}"`
    ].join(','))
  ].join('\n');
  
  return csvContent;
}

// Main verification function that can be called from browser console
async function runVerification() {
  try {
    const results = await verifyAccountDocumentIds();
    
    // Generate downloadable report if there are mismatches
    if (results.mismatches.length > 0) {
      const csvContent = generateMismatchReport(results.mismatches);
      console.log('\n📄 CSV Report (copy and save):');
      console.log(csvContent);
      
      // If running in browser, offer to download
      if (typeof window !== 'undefined' && window.document) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'account-id-mismatches.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('📥 Report downloaded as account-id-mismatches.csv');
      }
    }
    
    return results;
  } catch (error) {
    console.error('Failed to run verification:', error);
    return null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    verifyAccountDocumentIds,
    generateMismatchReport,
    runVerification
  };
}

// Auto-run if this script is loaded directly in browser console
if (typeof window !== 'undefined') {
  console.log('🚀 Account ID verification script loaded!');
  console.log('Run: runVerification() to start the verification process');
  
  // Make functions available globally in browser
  window.verifyAccountIds = runVerification;
  window.verifyAccountDocumentIds = verifyAccountDocumentIds;
}