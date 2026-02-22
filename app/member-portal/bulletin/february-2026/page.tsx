'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../../contexts/UnifiedAuthContext';
import PageLayout from '../../../../components/PageLayout';
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { getLineOfBusinessDisplay } from '../../../../lib/lines-of-business';

// Country code to name mapping
const countryNames: Record<string, string> = {
  'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'HR': 'Croatia',
  'CY': 'Cyprus', 'CZ': 'Czech Republic', 'DK': 'Denmark', 'EE': 'Estonia',
  'FI': 'Finland', 'FR': 'France', 'DE': 'Germany', 'GR': 'Greece',
  'HU': 'Hungary', 'IE': 'Ireland', 'IT': 'Italy', 'LV': 'Latvia',
  'LT': 'Lithuania', 'LU': 'Luxembourg', 'MT': 'Malta', 'NL': 'Netherlands',
  'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'SK': 'Slovakia',
  'SI': 'Slovenia', 'ES': 'Spain', 'SE': 'Sweden', 'GB': 'United Kingdom',
  'CH': 'Switzerland', 'NO': 'Norway', 'IS': 'Iceland', 'LI': 'Liechtenstein'
};

interface FaseStats {
  memberCount: number;
  countryCount: number;
  linesOfBusinessCount: number;
  byCountry: Record<string, number>;
  byLinesOfBusiness: Record<string, number>;
  mgaCount: number;
}

// Chart colors matching FASE report style
const CHART_COLORS = [
  '#2D5574', '#3B7A9E', '#4A9BB5', '#5AABB8', '#6ABFC4',
  '#D4A84B', '#E2B85A', '#F0C86A', '#F5D87A', '#F8E8A0',
];

// Donut Chart Component
function DonutChart({ data, centerLabel, size = 160 }: { data: Record<string, number>; centerLabel: string; size?: number }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sorted.length === 0 || total === 0) return null;

  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;
  const center = size / 2;

  let currentAngle = -90;
  const segments = sorted.map(([label, count], index) => {
    const percentage = (count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x1Inner = center + innerRadius * Math.cos(endRad);
    const y1Inner = center + innerRadius * Math.sin(endRad);
    const x2Inner = center + innerRadius * Math.cos(startRad);
    const y2Inner = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z`;

    return { path, color: CHART_COLORS[index % CHART_COLORS.length], label, count, percentage };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} className="hover:opacity-80 transition-opacity">
            <title>{seg.label}: {seg.count} ({seg.percentage.toFixed(0)}%)</title>
          </path>
        ))}
        <text x={center} y={center - 4} textAnchor="middle" className="text-xl font-bold" fill="#1a365d">{total}</text>
        <text x={center} y={center + 12} textAnchor="middle" className="text-[10px]" fill="#6b7280">{centerLabel}</text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {segments.slice(0, 5).map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 truncate">{seg.label}</span>
            <span className="ml-auto text-gray-800 font-medium">{seg.percentage.toFixed(0)}%</span>
          </div>
        ))}
        {sorted.length > 5 && (
          <div className="text-xs text-gray-400 pl-4">+{sorted.length - 5} more</div>
        )}
      </div>
    </div>
  );
}

// Bar Chart Component
function BarChart({ data, total, maxItems = 8 }: { data: Record<string, number>; total: number; maxItems?: number }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxItems);
  if (sorted.length === 0) return null;
  const maxCount = sorted[0][1];

  return (
    <div className="space-y-2">
      {sorted.map(([label, count], index) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const barWidth = (count / maxCount) * 100;
        const color = CHART_COLORS[index % CHART_COLORS.length];
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-40 truncate flex-shrink-0" title={label}>{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(barWidth, 4)}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-sm font-medium w-16 text-right" style={{ color }}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        );
      })}
      {Object.keys(data).length > maxItems && (
        <div className="text-xs text-gray-400 text-center pt-1">+{Object.keys(data).length - maxItems} more lines</div>
      )}
    </div>
  );
}

export default function February2026Edition() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();
  const [stats, setStats] = useState<FaseStats | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026');
    }
  }, [user, loading, router]);

  // Fetch FASE stats from Firestore
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const accountsRef = collection(db, 'accounts');
        const snapshot = await getDocs(accountsRef);

        const byCountry: Record<string, number> = {};
        const byLinesOfBusiness: Record<string, number> = {};
        let memberCount = 0;
        let mgaCount = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          // Only count active members (exclude flagged and rejected)
          if (data.status !== 'flagged' && data.status !== 'rejected') {
            memberCount++;

            // Get country
            const country = data.businessAddress?.country || data.registeredAddress?.country;
            if (country) {
              const countryName = countryNames[country] || country;
              byCountry[countryName] = (byCountry[countryName] || 0) + 1;
            }

            // Get lines of business (only for MGAs)
            if (data.organizationType === 'MGA') {
              mgaCount++;
              if (data.portfolio?.linesOfBusiness) {
                data.portfolio.linesOfBusiness.forEach((lob: string) => {
                  const label = getLineOfBusinessDisplay(lob, 'en');
                  byLinesOfBusiness[label] = (byLinesOfBusiness[label] || 0) + 1;
                });
              }
            }
          }
        });

        setStats({
          memberCount,
          countryCount: Object.keys(byCountry).length,
          linesOfBusinessCount: Object.keys(byLinesOfBusiness).length,
          byCountry,
          byLinesOfBusiness,
          mgaCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <PageLayout currentPage="member-portal">
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout currentPage="member-portal">
      <main className="min-h-screen bg-white">
        {/* Banner */}
        <div className="bg-fase-navy">
          <Image
            src="/bulletin/feb-2026/Bulletin-with-text.png"
            alt="The Entrepreneurial Underwriter - February 2026"
            width={1200}
            height={400}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 lg:px-8">

          {/* Back link */}
          <div className="py-6 border-b border-gray-100">
            <Link
              href="/member-portal"
              className="inline-flex items-center text-gray-500 hover:text-fase-navy text-sm"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Member Portal
            </Link>
          </div>

          {/* Introduction */}
          <div className="py-10 border-b border-gray-100">
            <p className="text-xl text-gray-800 leading-relaxed max-w-3xl">
              Welcome to the first edition of <strong>The Entrepreneurial Underwriter</strong>, FASE&apos;s bulletin for the European delegated underwriting community.
            </p>
            <p className="text-gray-600 mt-4 max-w-3xl">
              In this issue: a closer look at delegated authority at Lloyd&apos;s Europe, captive strategies for MGAs, and a snapshot of how FASE&apos;s community is growing.
            </p>
          </div>

          {/* Articles Grid */}
          <div className="py-10">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">In This Issue</h2>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Lloyd's Article */}
              <Link
                href="/member-portal/bulletin/february-2026/lloyds-europe"
                className="group block"
              >
                <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-lg">
                  <Image
                    src="/bulletin/feb-2026/lloyds-building.jpg"
                    alt="Lloyd&apos;s of London"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-fase-gold text-xs font-medium uppercase tracking-wider mb-2">Feature</p>
                <h3 className="text-2xl font-noto-serif font-semibold text-fase-navy group-hover:text-fase-navy/80 transition-colors mb-3">
                  Lloyd&apos;s in Europe: Coverholder Business Growing Fast After 123 Years
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Lloyd&apos;s EEA and Swiss coverholder business now accounts for 28% of Lloyd&apos;s total premium from the region. We separate myth from reality with Lloyd&apos;s own data.
                </p>
              </Link>

              {/* Captives Article */}
              <Link
                href="/member-portal/bulletin/february-2026/captives"
                className="group block"
              >
                <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-lg">
                  <Image
                    src="/consideration.jpg"
                    alt="Strategic considerations"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-fase-gold text-xs font-medium uppercase tracking-wider mb-2">Contributed Article</p>
                <h3 className="text-2xl font-noto-serif font-semibold text-fase-navy group-hover:text-fase-navy/80 transition-colors mb-2">
                  Seven Reasons to Consider a Captive
                </h3>
                <p className="text-gray-500 text-sm mb-3">By Mark Elliott, Polo Insurance Managers</p>
                <p className="text-gray-600 leading-relaxed">
                  The role of reinsurance captives has been growing in the capacity stack of MGAs. Mark Elliott highlights why profitable MGAs should consider establishing a captive.
                </p>
              </Link>
            </div>
          </div>

          {/* FASE by the Numbers */}
          <div className="py-10 border-t border-gray-100">
            <div className="flex items-baseline gap-3 mb-8">
              <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy">FASE by the Numbers</h2>
              <span className="text-gray-400 text-sm">February 2026</span>
            </div>

            {/* Key stats */}
            <div className="flex flex-wrap items-baseline gap-x-12 gap-y-4 mb-10">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-noto-serif font-bold text-fase-navy">
                  {stats?.memberCount ?? '—'}
                </span>
                <span className="text-gray-500">members</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-noto-serif font-bold text-fase-navy">
                  {stats?.countryCount ?? '—'}
                </span>
                <span className="text-gray-500">countries</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-noto-serif font-bold text-fase-navy">
                  {stats?.linesOfBusinessCount ?? '—'}
                </span>
                <span className="text-gray-500">lines of business</span>
              </div>
            </div>

            {/* Visualizations */}
            {stats && (
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Members by Country */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Members by Country</h3>
                  <DonutChart data={stats.byCountry} centerLabel="members" />
                </div>

                {/* Lines of Business */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Lines of Business</h3>
                  <BarChart data={stats.byLinesOfBusiness} total={stats.mgaCount} maxItems={8} />
                </div>
              </div>
            )}
          </div>

          {/* MGA Rendezvous */}
          <div className="py-10 border-t border-gray-100">
            <div className="bg-fase-navy rounded-xl overflow-hidden">
              <div className="lg:flex">
                <div className="lg:w-1/2 relative min-h-[300px]">
                  <Image
                    src="/mga-rendezvous-cathedral.jpg"
                    alt="MGA Rendezvous Barcelona"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="lg:w-1/2 p-10 lg:p-12 flex flex-col justify-center">
                  <p className="text-fase-gold text-xs font-medium uppercase tracking-wider mb-3">Event Update</p>
                  <h2 className="text-3xl font-noto-serif font-bold text-white mb-4">MGA Rendezvous 2026</h2>
                  <p className="text-white/80 mb-4">
                    More than 170 delegates have registered, representing 35 MGAs, 20 carriers and seven service providers. Total attendance is expected to exceed 500.
                  </p>
                  <p className="text-white font-medium mb-2">
                    Hotel Arts, Barcelona · 11-12 May 2026
                  </p>
                  <p className="text-white/70 text-sm mb-6">
                    FASE members benefit from a 50% discount on passes.
                  </p>
                  <div>
                    <a
                      href="https://mgarendezvous.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 bg-fase-gold text-fase-navy font-medium rounded hover:bg-fase-gold/90 transition-colors"
                    >
                      Register Now
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer spacing */}
          <div className="h-16"></div>

        </div>
      </main>
    </PageLayout>
  );
}
