'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import ContentPageLayout from '../../components/ContentPageLayout';
import Modal from '../../components/Modal';
import { getActiveSponsors, getSponsorsByTier, Sponsor } from '../../lib/sponsors';

interface SponsorCardProps {
  sponsor: Sponsor;
  locale: string;
  onViewDetails: (sponsor: Sponsor) => void;
}

function SponsorCard({ sponsor, locale, onViewDetails }: SponsorCardProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer w-80 h-80"
      onClick={() => onViewDetails(sponsor)}
    >
      <div className="p-8 h-full flex flex-col justify-center">
        <div className="text-center">
          <div className="relative w-64 h-64 mx-auto mb-4">
            <Image
              src={sponsor.logoUrl}
              alt={`${sponsor.name} logo`}
              fill
              className="object-contain"
            />
          </div>
          <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{sponsor.name}</h3>
        </div>
      </div>
    </div>
  );
}

export default function SponsorsPage() {
  const t = useTranslations('sponsors');
  const locale = useLocale();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  useEffect(() => {
    async function loadSponsors() {
      try {
        const sponsorData = await getActiveSponsors();
        setSponsors(sponsorData);
      } catch (error) {
        console.error('Error loading sponsors:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSponsors();
  }, []);

  const handleViewDetails = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSponsor(null);
  };
  
  const sponsorsByTier = getSponsorsByTier(sponsors);
  
  
  // Create sections for ContentPageLayout
  const sections = [];
  
  // Add intro section first
  sections.push({
    type: 'content' as const,
    title: t('intro.title'),
    content: [t('intro.content')]
  });

  if (loading) {
    sections.push({
      type: 'custom' as const,
      content: (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading sponsors...</p>
        </div>
      )
    });
  } else if (Object.keys(sponsorsByTier).length === 0) {
    sections.push({
      type: 'custom' as const,
      content: (
        <div className="text-center py-12">
          <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">
            {t('no_sponsors.title')}
          </h2>
          <p className="text-gray-600 text-lg">
            {t('no_sponsors.message')}
          </p>
        </div>
      )
    });
  } else {
    // Add each tier as a separate section - IMPORTANT: each tier needs its own section
    const tierEntries = Object.entries(sponsorsByTier);
    
    tierEntries.forEach(([tier, tierSponsors], index) => {
      const tierTitle = `${t('tiers.' + tier)} Sponsors`;
      
      // Each tier gets its own section to ensure blue ribbon separators  
      sections.push({
        type: 'custom' as const,
        content: (
          <div key={`tier-section-${tier}-${index}`} className="py-16 w-full">
            <h2 className="text-3xl font-noto-serif font-bold text-fase-navy text-center mb-12">
              {tierTitle}
            </h2>
            <div className="w-full flex justify-center">
              <div className="flex flex-wrap justify-center gap-8">
                {tierSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    locale={locale}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      });
    });
  }

  // Add contact section for sponsor enquiries
  sections.push({
    type: 'custom' as const,
    content: (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-12 text-center">
          Sponsor Enquiries
        </h2>
        
        <div className="space-y-8">
          <div className="text-center">
            <p className="text-lg text-fase-black mb-8">
              For sponsor enquiries, please contact:
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <svg className="w-6 h-6 text-fase-navy mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-lg text-fase-navy">
              william.pitt@fasemga.com
            </span>
          </div>
        </div>
      </div>
    )
  });


  return (
    <>
      <ContentPageLayout
        title={t('page.title')}
        bannerImage="/earlyMorning.jpg"
        bannerImageAlt={t('page.banner_alt')}
        sections={sections}
        currentPage="sponsors"
      />
      
      {/* Modal for sponsor details */}
      {selectedSponsor && (
        <Modal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          title={selectedSponsor.name}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <Image
                  src={selectedSponsor.logoUrl}
                  alt={`${selectedSponsor.name} logo`}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-4">
                {t('modal.about_prefix')} {selectedSponsor.name}
              </h3>
              <div className="text-gray-700 leading-relaxed mb-6">
                {(selectedSponsor.bio[locale as keyof typeof selectedSponsor.bio] || selectedSponsor.bio.en)
                  .split('\n')
                  .map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
              </div>
              
              <div className="flex justify-center space-x-4">
                <Link
                  href={selectedSponsor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-fase-navy text-white px-6 py-2 rounded-md font-semibold hover:bg-fase-steel transition-colors"
                >
                  {t('modal.visit_website')}
                </Link>
                <button
                  onClick={handleCloseModal}
                  className="inline-block border-2 border-fase-navy text-fase-navy px-6 py-2 rounded-md font-semibold hover:bg-fase-navy hover:text-white transition-colors"
                >
                  {t('modal.close')}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}