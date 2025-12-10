'use client';

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Button from '../../../components/Button';

interface VerificationResult {
  total: number;
  verified: number;
  mismatches: Array<{
    documentId: string;
    expectedId: string;
    email: string;
    displayName: string;
    personalName: string;
    createdAt: string;
  }>;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

export default function AccountVerificationTab() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<VerificationResult | null>(null);

  const verifyAccountDocumentIds = async (): Promise<VerificationResult> => {
    console.log('🔍 Starting account ID verification...');
    
    // Get all documents from the accounts collection
    const accountsRef = collection(db, 'accounts');
    const snapshot = await getDocs(accountsRef);
    
    const results: VerificationResult = {
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
            error: 'Missing uid field'
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
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || 'No created date'
          });
        }
      } catch (error) {
        results.errors.push({
          documentId: doc.id,
          error: `Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });
    
    return results;
  };

  const runVerification = async () => {
    setIsRunning(true);
    try {
      const verificationResults = await verifyAccountDocumentIds();
      setResults(verificationResults);
      console.log('Verification completed:', verificationResults);
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed. Check the console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (!results || results.mismatches.length === 0) return;
    
    const headers = ['Document ID', 'Expected UID', 'Email', 'Display Name', 'Personal Name', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...results.mismatches.map(mismatch => [
        `"${mismatch.documentId}"`,
        `"${mismatch.expectedId}"`,
        `"${mismatch.email}"`,
        `"${mismatch.displayName}"`,
        `"${mismatch.personalName}"`,
        `"${mismatch.createdAt}"`
      ].join(','))
    ].join('\n');
    
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
  };

  const getMismatchStatusClass = (count: number) => {
    if (count === 0) return 'text-green-600 bg-green-50';
    if (count <= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Account Document ID Verification
        </h3>
        <p className="text-gray-600 mb-4">
          This tool verifies that all Firestore account documents have document IDs that match their auth user IDs (uid field).
          This is important for security and data consistency.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">What this verification checks:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each document in the 'accounts' collection has a document ID</li>
          <li>• Each document contains a 'uid' field</li>
          <li>• The document ID matches the 'uid' field value</li>
          <li>• Reports any mismatches or missing uid fields</li>
        </ul>
      </div>

      <div>
        <Button
          variant="primary"
          onClick={runVerification}
          disabled={isRunning}
          className="flex items-center space-x-2"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Running verification...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Run Verification</span>
            </>
          )}
        </Button>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Verification Results</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{results.total}</div>
                <div className="text-sm text-gray-600">Total Accounts</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.verified}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
              
              <div className={`text-center p-3 rounded-lg ${getMismatchStatusClass(results.mismatches.length)}`}>
                <div className="text-2xl font-bold">{results.mismatches.length}</div>
                <div className="text-sm">Mismatches</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {results.mismatches.length === 0 && results.errors.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="text-green-800 font-medium">All account documents verified!</h5>
                    <p className="text-green-700 text-sm">All {results.total} account documents have correct document IDs that match their uid fields.</p>
                  </div>
                </div>
              </div>
            )}

            {results.mismatches.length > 0 && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-yellow-800 font-medium">Found {results.mismatches.length} mismatched documents</h5>
                      <p className="text-yellow-700 text-sm">These documents have document IDs that don't match their uid fields.</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={downloadReport}
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download CSV Report</span>
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected UID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Display Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Personal Name
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.mismatches.map((mismatch, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 bg-red-50">
                            {mismatch.documentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 bg-green-50">
                            {mismatch.expectedId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mismatch.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mismatch.displayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {mismatch.personalName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="text-red-800 font-medium mb-2">Errors encountered:</h5>
                <ul className="text-red-700 text-sm space-y-1">
                  {results.errors.map((error, index) => (
                    <li key={index} className="font-mono">
                      {error.documentId}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}