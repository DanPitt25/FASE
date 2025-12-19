'use client';

import React, { useState, useRef } from 'react';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';
import { db, storage } from '../../../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';

interface SponsorBio {
  de: string;
  en: string;
  es: string;
  fr: string;
  it: string;
  nl: string;
}

interface Sponsor {
  id: string;
  name: string;
  tier: 'silver' | 'gold' | 'platinum';
  logoUrl: string;
  websiteUrl: string;
  bio: SponsorBio;
  order: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function SponsorsTab() {
  const { user } = useUnifiedAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    tier: 'silver' as 'silver' | 'gold' | 'platinum',
    websiteUrl: '',
    bio: {
      en: '',
      fr: '',
      de: '',
      es: '',
      it: '',
      nl: ''
    },
    logoFile: null as File | null,
    order: 1,
    isActive: true
  });
  
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'>('en');

  // Load sponsors from Firestore
  const loadSponsors = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const sponsorsRef = collection(db, 'sponsors');
      const querySnapshot = await getDocs(sponsorsRef);
      const sponsorsData: Sponsor[] = [];
      
      querySnapshot.forEach((doc) => {
        sponsorsData.push({
          id: doc.id,
          ...doc.data()
        } as Sponsor);
      });
      
      // Sort by tier priority and order
      const tierOrder = { platinum: 1, gold: 2, silver: 3 };
      sponsorsData.sort((a, b) => {
        const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
        if (tierDiff !== 0) return tierDiff;
        return a.order - b.order;
      });
      
      setSponsors(sponsorsData);
    } catch (error) {
      console.error('Error loading sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload logo to Firebase Storage
  const uploadLogo = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `sponsors/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Create or update sponsor
  const handleSaveSponsor = async () => {
    if (!user?.uid || !formData.name || !formData.websiteUrl || (!formData.logoFile && !editingSponsor)) {
      alert('Please fill in all required fields and select a logo');
      return;
    }

    setUploading(true);
    try {
      let logoUrl = editingSponsor?.logoUrl || '';
      
      // Upload new logo if provided
      if (formData.logoFile) {
        logoUrl = await uploadLogo(formData.logoFile);
      }

      const sponsorData = {
        name: formData.name,
        tier: formData.tier,
        logoUrl,
        websiteUrl: formData.websiteUrl,
        bio: formData.bio,
        order: formData.order,
        isActive: formData.isActive,
        updatedAt: new Date()
      };

      if (editingSponsor) {
        // Update existing sponsor
        await updateDoc(doc(db, 'sponsors', editingSponsor.id), sponsorData);
        setSponsors(prev => prev.map(s => 
          s.id === editingSponsor.id ? { ...s, ...sponsorData } : s
        ));
      } else {
        // Create new sponsor
        const docRef = await addDoc(collection(db, 'sponsors'), {
          ...sponsorData,
          createdAt: new Date()
        });
        setSponsors(prev => [...prev, { 
          id: docRef.id, 
          ...sponsorData,
          createdAt: new Date()
        } as Sponsor]);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        tier: 'silver',
        websiteUrl: '',
        bio: { en: '', fr: '', de: '', es: '', it: '', nl: '' },
        logoFile: null,
        order: 1,
        isActive: true
      });
      setEditingSponsor(null);
      setShowCreateModal(false);
      setCurrentLanguage('en');
      
      // Reload to ensure proper sorting
      await loadSponsors();
    } catch (error) {
      console.error('Error saving sponsor:', error);
      alert('Error saving sponsor. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete sponsor
  const handleDeleteSponsor = async (sponsor: Sponsor) => {
    if (!confirm(`Are you sure you want to delete ${sponsor.name}?`)) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'sponsors', sponsor.id));
      
      // Delete logo from Storage
      if (sponsor.logoUrl) {
        try {
          const logoRef = ref(storage, sponsor.logoUrl);
          await deleteObject(logoRef);
        } catch (storageError) {
          console.warn('Error deleting logo file:', storageError);
        }
      }
      
      setSponsors(prev => prev.filter(s => s.id !== sponsor.id));
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      alert('Error deleting sponsor. Please try again.');
    }
  };

  // Edit sponsor
  const handleEditSponsor = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      tier: sponsor.tier,
      websiteUrl: sponsor.websiteUrl,
      bio: sponsor.bio,
      logoFile: null,
      order: sponsor.order,
      isActive: sponsor.isActive
    });
    setShowCreateModal(true);
  };

  // Load sponsors on component mount
  React.useEffect(() => {
    loadSponsors();
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sponsors Management</h2>
        <Button 
          onClick={() => {
            setEditingSponsor(null);
            setFormData({
              name: '',
              tier: 'silver',
              websiteUrl: '',
              bio: { en: '', fr: '', de: '', es: '', it: '', nl: '' },
              logoFile: null,
              order: 1,
              isActive: true
            });
            setCurrentLanguage('en');
            setShowCreateModal(true);
          }}
          variant="primary"
        >
          Add New Sponsor
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sponsors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sponsors found. Add your first sponsor above.
            </div>
          ) : (
            sponsors.map((sponsor) => (
              <div key={sponsor.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={sponsor.logoUrl}
                      alt={`${sponsor.name} logo`}
                      fill
                      className="object-contain rounded"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{sponsor.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        sponsor.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                        sponsor.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        sponsor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {sponsor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Website: <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {sponsor.websiteUrl}
                      </a>
                    </p>
                    
                    <p className="text-sm text-gray-600">
                      Order: {sponsor.order}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSponsor(sponsor)}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSponsor(sponsor)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Sponsor Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
        maxWidth="xl"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sponsor Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Company Name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier
              </label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData(prev => ({ ...prev, tier: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL *
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="https://example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                min="1"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo {!editingSponsor && '*'}
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFormData(prev => ({ ...prev, logoFile: file }));
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-fase-navy file:text-white hover:file:bg-fase-blue"
              />
              {editingSponsor && editingSponsor.logoUrl && !formData.logoFile && (
                <div className="relative w-12 h-12">
                  <Image
                    src={editingSponsor.logoUrl}
                    alt="Current logo"
                    fill
                    className="object-contain rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active (visible on sponsors page)
            </label>
          </div>

          {/* Multi-language Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Bio
            </label>
            
            {/* Language Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-4">
              {Object.entries({
                en: 'English',
                fr: 'Français', 
                de: 'Deutsch',
                es: 'Español',
                it: 'Italiano',
                nl: 'Nederlands'
              }).map(([locale, name]) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setCurrentLanguage(locale as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                    currentLanguage === locale
                      ? 'bg-fase-navy text-white border-b-2 border-fase-navy'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {name}
                  {formData.bio[locale as keyof typeof formData.bio] && (
                    <span className="ml-1 text-green-400">✓</span>
                  )}
                </button>
              ))}
            </div>

            <textarea
              value={formData.bio[currentLanguage]}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                bio: {
                  ...prev.bio,
                  [currentLanguage]: e.target.value
                }
              }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder={`Company description in ${currentLanguage.toUpperCase()}...`}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSaveSponsor}
              disabled={uploading || !formData.name || !formData.websiteUrl || (!formData.logoFile && !editingSponsor)}
            >
              {uploading ? 'Saving...' : editingSponsor ? 'Update Sponsor' : 'Create Sponsor'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}