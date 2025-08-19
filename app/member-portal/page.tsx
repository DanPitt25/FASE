'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import MemberContent from './member-content';

export default function MemberPortalPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Member Portal', id: 'member-portal' }
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
        
        <ContentHero id="member-portal" fullHeight={true} className="bg-white py-20">
          <MemberContent />
        </ContentHero>
      </main>
    </PageLayout>
  );
}