'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import Button from '../../components/Button';

export default function MemberPortalPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Member Access', id: 'member-access' }
  ];

  return (
    <PageLayout currentPage="member-portal" sections={sections}>
      <main className="flex-1">
        <TitleHero
          id="hero"
          title="Member Portal"
          subtitle="FASE - The Federation of European MGAs - representing the MGA community across Europe."
          fullHeight={true}
        />
        
        <ContentHero id="member-access" fullHeight={true} className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">Member Access Required</h2>
            <p className="text-lg text-fase-steel mb-8">
              The member portal will be available to registered members after FASE launches.
            </p>
            <div className="space-x-4">
              <Button href="/join" variant="primary" size="large">
                Register Interest
              </Button>
              <Button href="/" variant="secondary" size="large">
                Back to Home
              </Button>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}