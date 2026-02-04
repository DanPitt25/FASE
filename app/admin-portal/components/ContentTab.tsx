'use client';

import { useState } from 'react';
import BioReviewTab from './BioReviewTab';
import SponsorsTab from './SponsorsTab';
import TempAccountTab from './TempAccountTab';

type ContentSection = 'reviews' | 'sponsors' | 'directory';

export default function ContentTab() {
  const [activeSection, setActiveSection] = useState<ContentSection>('reviews');

  const sections = [
    { id: 'reviews' as const, label: 'Pending Reviews', description: 'Bio & logo approvals' },
    { id: 'sponsors' as const, label: 'Sponsors', description: 'Manage sponsors' },
    { id: 'directory' as const, label: 'Directory', description: 'Temp entries' }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-2">
        <div className="flex gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-fase-navy text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div>{section.label}</div>
              <div className={`text-xs mt-0.5 ${activeSection === section.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {section.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeSection === 'reviews' && <BioReviewTab />}
      {activeSection === 'sponsors' && <SponsorsTab />}
      {activeSection === 'directory' && <TempAccountTab />}
    </div>
  );
}
