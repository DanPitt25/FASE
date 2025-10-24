'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../components/Button';

export default function JoinCompanyPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
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
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
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
    
    if (!fullName.trim()) {
      setError('Please enter your full name');
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
        fullName,
        jobTitle,
        requestedAt: serverTimestamp(),
        status: 'pending', // 'pending' | 'approved' | 'rejected'
        companyId: selectedCompany.id,
        companyName: selectedCompany.organizationName,
        // For admin tracking
        processedAt: null,
        processedBy: null,
        adminNotes: null
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
      <div className="min-h-screen bg-fase-navy py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold overflow-hidden">
            <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center">
              <div className="flex items-center space-x-3">
                <img 
                  src="/fase-logo-mark.png" 
                  alt="FASE Logo" 
                  className="h-10 w-auto object-contain"
                />
                <h1 className="text-2xl font-noto-serif font-bold text-fase-navy">FASE</h1>
              </div>
            </div>
            <div className="bg-white px-6 py-8 text-center">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fase-navy py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center">
            <div className="flex items-center space-x-3">
              <img 
                src="/fase-logo-mark.png" 
                alt="FASE Logo" 
                className="h-10 w-auto object-contain"
              />
              <h1 className="text-2xl font-noto-serif font-bold text-fase-navy">FASE</h1>
            </div>
            <h2 className="text-xl font-noto-serif font-medium text-fase-navy">
              Join Company Membership
            </h2>
            <p className="text-fase-black text-sm">
              Request access to your organization&apos;s existing FASE membership
            </p>
          </div>
          <div className="bg-white px-6 py-8">

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-fase-black mb-2">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-fase-light-gold focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="John Smith"
                  />
                </div>
                
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
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-fase-black mb-2">
                    Job Title (Optional)
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-fase-light-gold focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="e.g. Underwriter, Operations Manager"
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
      </div>
    </div>
  );
}