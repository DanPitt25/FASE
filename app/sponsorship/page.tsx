'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import Button from '../../components/Button';

export default function SponsorshipPage() {  return (
    <PageLayout currentPage="sponsorship">
      <main className="flex-1">
        <TitleHero
          id="hero"
          title="Sponsorship"
          useDefaultSubtitle={true}
          backgroundImage="/conference.jpg"
          fullHeight={true}
        />
        
        <ContentHero id="coming-soon" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-6">Coming Soon</h2>
            <p className="text-lg text-fase-black mb-8">
              Sponsorship opportunities will be available when FASE officially launches.
            </p>
            <Button href="/" variant="primary" size="large">
              Back to Home
            </Button>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}