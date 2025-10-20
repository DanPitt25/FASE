'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Button from '../../components/Button';

export default function JoinCompanyPage() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Check if company exists and has active membership
      const accountsRef = collection(db, 'accounts');
      const companyQuery = query(
        accountsRef,
        where('organizationName', '==', companyName),
        where('membershipType', '==', 'corporate'),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(companyQuery);
      
      if (querySnapshot.empty) {
        throw new Error('Company not found or does not have an active FASE membership');
      }
      
      // Check if user email domain matches company domain (optional validation)
      const emailDomain = email.split('@')[1];
      const companyDoc = querySnapshot.docs[0];
      const companyData = companyDoc.data();
      
      // Create a membership request for admin approval
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const requestId = `${companyDoc.id}_${Date.now()}`;
      
      await setDoc(doc(db, 'membership_requests', requestId), {
        email,
        companyName,
        companyId: companyDoc.id,
        companyAdminEmail: companyData.primaryContact?.email,
        requestedAt: serverTimestamp(),
        status: 'pending',
        type: 'company_linking'
      });
      
      setSuccess(true);
      
    } catch (error: any) {
      setError(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen bg-white font-lato">
        <div className="flex-1 relative">
          <Header currentPage="join-company" />
          
          <section className="min-h-[80vh] flex items-center justify-center py-20">
            <div className="max-w-md mx-auto px-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                <div className="text-green-600 text-5xl mb-4">✓</div>
                <h2 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">
                  Request Submitted
                </h2>
                <p className="text-fase-black mb-6">
                  Your request to join {companyName} has been sent to the company administrator for approval.
                </p>
                <Button
                  onClick={() => router.push('/login')}
                  variant="primary"
                  size="large"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          </section>
          
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-lato">
      <div className="flex-1 relative">
        <Header currentPage="join-company" />
        
        <section className="min-h-[80vh] flex items-center justify-center py-20">
          <div className="max-w-md mx-auto px-4">
            <div className="bg-white border border-fase-light-gold shadow-lg rounded-lg p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-noto-serif font-medium text-fase-navy mb-4">
                  Join Company Membership
                </h1>
                <p className="text-fase-black">
                  Request access to your organization's existing FASE membership
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-fase-black mb-2">
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-fase-light-gold focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="your.email@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-fase-black mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-fase-light-gold focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="Your Company Name"
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Submitting Request...' : 'Request Access'}
                </Button>
              </form>

              <div className="text-center mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-fase-navy hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    </div>
  );
}