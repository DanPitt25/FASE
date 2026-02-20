'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../../../contexts/UnifiedAuthContext';
import PageLayout from '../../../../../components/PageLayout';
import Image from 'next/image';
import Link from 'next/link';

export default function CaptivesArticle() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026/captives');
    }
  }, [user, loading, router]);

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
        {/* Hero */}
        <div className="relative h-[45vh] min-h-[360px] overflow-hidden">
          <Image
            src="/consideration.jpg"
            alt="Strategic considerations"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-4xl mx-auto px-6 pb-10 w-full">
              <Link
                href="/member-portal/bulletin/february-2026"
                className="inline-flex items-center text-white/70 hover:text-white text-sm mb-4"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                February 2026 Edition
              </Link>
              <p className="text-fase-gold text-xs font-semibold uppercase tracking-widest mb-3">Contributed Article</p>
              <h1 className="text-3xl md:text-4xl font-noto-serif font-bold text-white leading-snug mb-3">
                Seven Reasons to Consider a Captive
              </h1>
              <p className="text-white/70">By Mark Elliott, Polo Insurance Managers</p>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-6 py-10">

          {/* Lead paragraph */}
          <p className="text-lg text-gray-800 leading-relaxed mb-8">
            The role of reinsurance captives has been growing in the capacity stack of MGAs in the United States and United Kingdom. In the first of a series of monthly articles on captive management issues, Mark Elliott, CEO of Guernsey-based Polo Insurance Managers, highlights the top seven reasons why profitable MGAs of all sizes across Europe should consider establishing a captive.
          </p>

          {/* Body */}
          <div className="text-base text-gray-700 leading-relaxed space-y-5">
            <p>
              It is estimated that there are over 300 MGAs in the UK retaining some of their own risk. But in continental Europe, MGAs have generally been slower to retain risk through captives. For MGAs that can demonstrate a profitable track record, there are seven good reasons to consider retaining risk through a captive.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">1. Enhanced Margin Capture</h2>
            <p>
              Retaining a portion of the risk allows the MGA to participate directly in underwriting profits rather than ceding all value to capacity providers.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">2. Greater Control Over Capacity</h2>
            <p>
              A captive reduces dependence on third-party insurers and reinsurers, improving resilience during hard markets or sudden capacity withdrawals.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">3. Alignment of Underwriting Incentives</h2>
            <p>
              Retention enforces stronger underwriting discipline by directly linking portfolio performance to the MGA&apos;s own capital at risk.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">4. Improved Negotiating Power with Carriers</h2>
            <p>
              Demonstrated "skin in the game" strengthens credibility and can lead to better commission terms, profit shares, and long-term capacity agreements. Indeed we have seen some clients who managed to increase commission just by having the captive in place – they didn&apos;t even take a retention initially.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">5. Access to Reinsurance Markets on Better Terms</h2>
            <p>
              A captive can access quota share or excess-of-loss reinsurance directly, often at more efficient pricing than through fronted arrangements alone. There is still an insurance / reinsurance pricing arbitrage which we often see – especially when the incumbent insurer has been on the programme for many years.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">6. Portfolio Diversification and Capital Efficiency</h2>
            <p>
              Well-structured captives (often domiciled in EU-friendly jurisdictions) allow optimized capital usage across lines, geographies, and cycles. Traditionally Malta is an excellent location for direct EU access, but requires scale. Guernsey can operate using a fronting insurer and can sometimes be more cost-effective from a cost and capital perspective for smaller programmes.
            </p>

            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy pt-6 pb-2">7. Strategic Optionality and Scalability</h2>
            <p>
              Captives enable controlled experimentation with new products, niches, or geographies without full reliance on external carriers. We need many new start-ups and the incubation of new products in their own captive helps collect data and demonstrates to insurers a positive alignment of interest.
            </p>
          </div>

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 italic leading-relaxed">
              In the March issue, we will dig further into the practicalities of captive establishment – and the merits of different domiciles – for European MGAs.
            </p>
          </div>

          {/* Back link */}
          <div className="mt-8">
            <Link
              href="/member-portal/bulletin/february-2026"
              className="inline-flex items-center text-fase-navy text-sm font-medium hover:underline"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to February 2026 Edition
            </Link>
          </div>
        </article>
      </main>
    </PageLayout>
  );
}
