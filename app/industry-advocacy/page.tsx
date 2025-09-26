'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import Button from '../../components/Button';

export default function IndustryAdvocacyPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Coming Soon', id: 'coming-soon' }
  ];

  return (
    <PageLayout currentPage="industry-advocacy" sections={sections}>
      <main className="flex-1">
        <TitleHero
          id="hero"
          title="Industry Advocacy"
          subtitle="Voice for MGAs in regulatory discussions at national and pan-European levels."
          backgroundImage="/regulatory.jpg"
          fullHeight={true}
        />
        
        <ContentHero id="coming-soon" fullHeight={true} className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-playfair font-bold text-fase-navy mb-6">Coming Soon</h2>
            <p className="text-lg text-fase-steel mb-8">
              FASE will advocate for MGA interests in regulatory and policy discussions across Europe once officially launched.
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