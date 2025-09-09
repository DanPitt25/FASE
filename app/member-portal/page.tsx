'use client';

import PageLayout from '../../components/PageLayout';
import MemberContent from './member-content';

export default function MemberPortalPage() {
  return (
    <PageLayout currentPage="member-portal">
      <main className="flex-1 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-futura font-bold text-fase-navy mb-4">Member Portal</h1>
            <p className="text-lg text-fase-steel">Manage your FASE membership and access member resources</p>
          </div>
          <MemberContent />
        </div>
      </main>
    </PageLayout>
  );
}