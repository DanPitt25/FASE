'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import Button from '../../components/Button';

export default function DigitalPlatformPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Coming Soon', id: 'coming-soon' }
  ];

  return (
    <PageLayout currentPage="digital-platform" sections={sections}>
      <main className="flex-1">
        <TitleHero
          id="hero"
          title="Digital Platform"
          subtitle="Multi-lingual digital platform providing technical, regulatory, and risk appetite resources for MGA members."
          backgroundImage="/data.jpg"
          fullHeight={true}
        />
        
        <ContentHero id="coming-soon" fullHeight={true} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-6">Coming Soon</h2>
            <p className="text-lg text-fase-black mb-8">
              Our digital platform will provide comprehensive resources and tools for FASE members once officially launched.
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