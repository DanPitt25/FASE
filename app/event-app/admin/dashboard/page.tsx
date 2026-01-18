'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../../contexts/UnifiedAuthContext';

interface Stats {
  totalRegistrations: number;
  totalAttendees: number;
  checkedIn: number;
  pendingPayment: number;
  revenue: number;
  byOrganizationType: Record<string, number>;
  byCountry: Record<string, number>;
  recentRegistrations: Array<{
    id: string;
    company: string;
    attendeeCount: number;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { isAdmin, loading } = useUnifiedAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/event-app');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/event-app/admin/stats?detailed=true');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-fase-navy text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Dashboard</h1>
      </div>

      {loadingStats ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
        </div>
      ) : stats ? (
        <div className="px-4 py-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Registrations"
              value={stats.totalRegistrations}
              icon="📋"
            />
            <StatCard
              label="Total Attendees"
              value={stats.totalAttendees}
              icon="👥"
            />
            <StatCard
              label="Checked In"
              value={stats.checkedIn}
              icon="✅"
              subtext={`${stats.totalAttendees > 0 ? Math.round((stats.checkedIn / stats.totalAttendees) * 100) : 0}% attendance`}
            />
            <StatCard
              label="Pending Payment"
              value={stats.pendingPayment}
              icon="⏳"
              highlight={stats.pendingPayment > 0}
            />
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Revenue</h2>
              <span className="text-2xl font-bold text-fase-navy">
                €{stats.revenue.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-fase-navy rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((stats.revenue / 100000) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Target: €100,000</p>
          </div>

          {/* By Organization Type */}
          {stats.byOrganizationType && Object.keys(stats.byOrganizationType).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-4">By Organization Type</h2>
              <div className="space-y-3">
                {Object.entries(stats.byOrganizationType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-700 capitalize">
                        {type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-fase-light-blue rounded-full"
                            style={{
                              width: `${(count / stats.totalAttendees) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top Countries */}
          {stats.byCountry && Object.keys(stats.byCountry).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Top Countries</h2>
              <div className="space-y-3">
                {Object.entries(stats.byCountry)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between">
                      <span className="text-gray-700">{country}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Registrations */}
          {stats.recentRegistrations && stats.recentRegistrations.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Recent Registrations</h2>
              <div className="space-y-3">
                {stats.recentRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{reg.company}</p>
                      <p className="text-xs text-gray-500">
                        {reg.attendeeCount} attendee{reg.attendeeCount !== 1 ? 's' : ''} •{' '}
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center py-12">
          <p className="text-gray-500">Unable to load statistics</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  subtext,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl shadow-sm p-4 ${highlight ? 'bg-yellow-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}
