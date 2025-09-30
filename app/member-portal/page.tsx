'use client';

import PageLayout from '../../components/PageLayout';
import MemberContent from './member-content';

export default function MemberPortalPage() {
  return (
    <PageLayout currentPage="member-portal">
      <main className="flex-1 bg-fase-cream min-h-[calc(100vh-5.5rem)]">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MemberContent />
        </div>
      </main>
    </PageLayout>
  );
}