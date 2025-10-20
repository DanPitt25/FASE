'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Button from '../../components/Button';

export default function JoinCompanyPage() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const searchCompanies = async () => {
      if (companySearch.length < 2) {
        setCompanies([]);
        setShowDropdown(false);
        return;
      }

      try {
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const accountsRef = collection(db, 'accounts');
        const companyQuery = query(
          accountsRef,
          where('membershipType', '==', 'corporate'),
          where('status', 'in', ['approved', 'active']),
          limit(10)
        );
        
        const querySnapshot = await getDocs(companyQuery);
        const results = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(company => 
            company.organizationName?.toLowerCase().includes(companySearch.toLowerCase())
          );
        
        setCompanies(results);
        setShowDropdown(true);
        
      } catch (error) {
        console.error('Error searching companies:', error);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [companySearch]);

  const handleCompanySelect = (company: any) => {
    setSelectedCompany(company);
    setCompanyName(company.organizationName);
    setCompanySearch(company.organizationName);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!selectedCompany) {
      setError('Please select a company from the dropdown');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create a joining request in the organization's join_requests subcollection
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const requestId = `${Date.now()}_${email.replace(/[@.]/g, '_')}`;
      
      // Add request to organization's join_requests subcollection
      const joinRequestRef = doc(db, 'accounts', selectedCompany.id, 'join_requests', requestId);
      await setDoc(joinRequestRef, {
        email,
        requestedAt: serverTimestamp(),
        status: 'pending',
        requestorName: email.split('@')[0] // fallback name from email
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
                  Request access to your organization&apos;s existing FASE membership
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

                <div className="relative">
                  <label htmlFor="companySearch" className="block text-sm font-medium text-fase-black mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companySearch"
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setSelectedCompany(null);
                      setCompanyName('');
                    }}
                    onFocus={() => companySearch.length >= 2 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    required
                    className="w-full px-3 py-2 border border-fase-light-gold focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="Start typing your company name..."
                  />
                  
                  {showDropdown && companies.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-fase-light-gold mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {companies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleCompanySelect(company)}
                          className="w-full text-left px-3 py-2 hover:bg-fase-cream border-b border-fase-light-gold last:border-b-0"
                        >
                          <div className="font-medium text-fase-navy">{company.organizationName}</div>
                          {company.registeredAddress?.country && (
                            <div className="text-sm text-fase-black">{company.registeredAddress.country}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {showDropdown && companySearch.length >= 2 && companies.length === 0 && (
                    <div className="absolute z-10 w-full bg-white border border-fase-light-gold mt-1 px-3 py-2 text-fase-black text-sm">
                      No companies found. Make sure your company has an active FASE membership.
                    </div>
                  )}
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