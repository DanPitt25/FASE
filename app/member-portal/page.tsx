'use client';

import PageLayout from '../../components/PageLayout';
import MemberContent from './member-content';

export default function MemberPortalPage() {
  return (
    <PageLayout currentPage="member-portal">
      <main className="flex-1 bg-fase-pearl min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MemberContent />
        </div>
      </main>
    </PageLayout>
  );
}