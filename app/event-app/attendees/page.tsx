'use client';

import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';

interface Attendee {
  id: string;
  name: string;
  company: string;
  jobTitle: string;
  organizationType: string;
  country: string;
  bio?: string;
}

const organizationTypeLabels: Record<string, string> = {
  mga: 'MGA',
  insurer: 'Insurer',
  reinsurer: 'Reinsurer',
  lloyds: "Lloyd's",
  broker: 'Broker',
  service_provider: 'Service Provider',
};

export default function AttendeesPage() {
  const { user } = useUnifiedAuth();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);

  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const response = await fetch('/api/event-app/attendees');
        if (response.ok) {
          const data = await response.json();
          setAttendees(data);
        }
      } catch (error) {
        console.error('Failed to fetch attendees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  }, []);

  const filteredAttendees = attendees.filter((attendee) => {
    const matchesSearch =
      attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || attendee.organizationType === filterType;
    return matchesSearch && matchesFilter;
  });

  // Group by company
  const groupedByCompany = filteredAttendees.reduce((acc, attendee) => {
    if (!acc[attendee.company]) {
      acc[attendee.company] = [];
    }
    acc[attendee.company].push(attendee);
    return acc;
  }, {} as Record<string, Attendee[]>);

  const sortedCompanies = Object.keys(groupedByCompany).sort();

  if (!user) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-6xl mb-4">🤝</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to view and connect with other attendees.
            </p>
            <a
              href="/login"
              className="inline-block bg-fase-navy text-white px-6 py-3 rounded-lg font-medium"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Attendees</h1>
          <p className="text-sm text-gray-500">{attendees.length} registered</p>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fase-navy/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <FilterPill
            label="All"
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          />
          <FilterPill
            label="MGAs"
            active={filterType === 'mga'}
            onClick={() => setFilterType('mga')}
          />
          <FilterPill
            label="Insurers"
            active={filterType === 'insurer'}
            onClick={() => setFilterType('insurer')}
          />
          <FilterPill
            label="Reinsurers"
            active={filterType === 'reinsurer'}
            onClick={() => setFilterType('reinsurer')}
          />
          <FilterPill
            label="Brokers"
            active={filterType === 'broker'}
            onClick={() => setFilterType('broker')}
          />
        </div>
      </div>

      {/* Attendee List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendees found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCompanies.map((company) => (
              <div key={company}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {company}
                </h2>
                <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                  {groupedByCompany[company].map((attendee) => (
                    <button
                      key={attendee.id}
                      onClick={() => setSelectedAttendee(attendee)}
                      className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-fase-navy/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-fase-navy font-medium">
                          {attendee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{attendee.name}</p>
                        <p className="text-sm text-gray-500 truncate">{attendee.jobTitle}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {organizationTypeLabels[attendee.organizationType] || attendee.organizationType}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendee Detail Modal */}
      {selectedAttendee && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedAttendee(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="px-6 pb-8">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-fase-navy/10 rounded-full flex items-center justify-center">
                  <span className="text-fase-navy text-2xl font-medium">
                    {selectedAttendee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              </div>

              {/* Name & Title */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedAttendee.name}</h2>
                <p className="text-gray-600">{selectedAttendee.jobTitle}</p>
                <p className="text-fase-navy font-medium">{selectedAttendee.company}</p>
              </div>

              {/* Details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                    🏢
                  </span>
                  <div>
                    <p className="text-xs text-gray-500">Organization Type</p>
                    <p className="text-gray-900">
                      {organizationTypeLabels[selectedAttendee.organizationType] || selectedAttendee.organizationType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                    🌍
                  </span>
                  <div>
                    <p className="text-xs text-gray-500">Country</p>
                    <p className="text-gray-900">{selectedAttendee.country}</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedAttendee.bio && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">About</h3>
                  <p className="text-gray-700">{selectedAttendee.bio}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAttendee(null)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-fase-navy text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
