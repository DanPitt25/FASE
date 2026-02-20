'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../../../contexts/UnifiedAuthContext';
import PageLayout from '../../../../../components/PageLayout';
import Image from 'next/image';
import Link from 'next/link';

function ChartModal({
  isOpen,
  onClose,
  src,
  alt,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  title: string;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-fase-navy">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <Image
            src={src}
            alt={alt}
            width={838}
            height={600}
            className="w-full h-auto"
          />
        </div>
        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
          Source: Lloyd's
        </div>
      </div>
    </div>
  );
}

function ChartFigure({
  src,
  alt,
  title,
  caption
}: {
  src: string;
  alt: string;
  title: string;
  caption: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <figure
        className="group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative overflow-hidden rounded border border-gray-200 bg-white">
          <Image
            src={src}
            alt={alt}
            width={838}
            height={500}
            className="w-full h-auto transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-fase-navy text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
              Click to expand
            </span>
          </div>
        </div>
        <figcaption className="mt-2 text-xs text-gray-500">{caption}</figcaption>
      </figure>
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        src={src}
        alt={alt}
        title={title}
      />
    </>
  );
}

export default function LloydsEuropeArticle() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026/lloyds-europe');
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
        <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
          <Image
            src="/earlyMorning.jpg"
            alt="Lloyd's of London"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-5xl mx-auto px-6 pb-12 w-full">
              <Link
                href="/member-portal/bulletin/february-2026"
                className="inline-flex items-center text-white/60 hover:text-white text-sm mb-6 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                February 2026
              </Link>
              <p className="text-fase-gold text-xs font-semibold uppercase tracking-widest mb-3">Feature</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-noto-serif font-bold text-white leading-tight max-w-3xl">
                Lloyd's in Europe: Coverholder Business Growing Fast After 123 Years
              </h1>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-5xl mx-auto px-6">

          {/* Lead */}
          <div className="py-10 border-b border-gray-100">
            <p className="text-xl text-gray-800 leading-relaxed max-w-3xl">
              Ever since the pioneering Lloyd's underwriter, Cuthbert Heath, first granted a binding authority to his agent in Amsterdam, Alfred Schroder, in 1903, Lloyd's has played a key role in the development of Europe's delegated authority market.
            </p>
          </div>

          {/* Section 1 */}
          <div className="py-10 border-b border-gray-100">
            <div className="lg:grid lg:grid-cols-5 lg:gap-12">
              <div className="lg:col-span-3 text-gray-700 leading-relaxed">
                <p>
                  Today, Lloyd's writes approximately <strong className="text-fase-navy">28% of its total premiums</strong> (€1,685m out of €5,939m) from the European Economic Area plus Switzerland on a delegated authority basis. Five hundred and thirty-two Lloyd's coverholders, including many of the region's leading MGAs, underwrite a wide array of business backed by Lloyd's binding authorities.
                </p>
              </div>
              <div className="lg:col-span-2 mt-6 lg:mt-0">
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-pie-chart.png"
                  alt="Lloyd's Binder Business breakdown by class"
                  title="Lloyd's Binder Business, EEA + Switzerland, 2025"
                  caption="Binder business by class. Total: €1.685bn"
                />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="py-10 border-b border-gray-100">
            <div className="lg:grid lg:grid-cols-5 lg:gap-12">
              <div className="lg:col-span-3 text-gray-700 leading-relaxed">
                <p>
                  In recent years, Lloyd's managing agents' delegated authority business in Europe has surged, growing by <strong className="text-fase-navy">15% annually</strong> between 2023 and 2025. The share of coverholder business in national markets varies widely. In Italy, Lloyd's 88 coverholders generated 61% of the market's total premium in 2025; in France the coverholder proportion was 43%; in Ireland, 28%; in Germany, 20%; and in Switzerland just 8%.
                </p>
              </div>
              <div className="lg:col-span-2 mt-6 lg:mt-0">
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-coverholder-count.png"
                  alt="Number of Lloyd's coverholders by country"
                  title="Accredited Lloyd's Coverholders by Country, 2025"
                  caption="Number of accredited coverholders by market"
                />
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="py-10 border-b border-gray-100">
            <div className="lg:grid lg:grid-cols-5 lg:gap-12">
              <div className="lg:col-span-3 text-gray-700 leading-relaxed space-y-4">
                <p>
                  The overall figures are boosted by Lloyd's broad definition of what constitutes a coverholder, which includes 61 service companies owned and operated by Lloyd's managing agents. Coverholder business also includes business underwritten by consortia of Lloyd's syndicates, under which the lead syndicate operates with delegated authority from following syndicates.
                </p>
                <p>
                  Many Lloyd's coverholders are brokers with tightly worded binding authorities for particular classes of business. They operate as an efficient distribution channel for Lloyd's products but have little or no underwriting autonomy. But in common with insurance and reinsurance companies around the world, Lloyd's syndicates have also been increasing their capacity allocations to MGAs.
                </p>
              </div>
              <div className="lg:col-span-2 mt-6 lg:mt-0">
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-penetration.png"
                  alt="Coverholder penetration by market"
                  title="Coverholder Penetration by Market, 2025"
                  caption="Penetration ranges from 61% (Italy) to 8% (Switzerland)"
                />
              </div>
            </div>
          </div>

          {/* Remaining content */}
          <div className="py-10 max-w-3xl">
            <div className="text-gray-700 leading-relaxed space-y-6">
              <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy">No Longer Short-Termist</h2>

              <p>
                Lloyd's capacity was historically tendered on a short-term – and often opportunistic - basis. But since 2016 Lloyd's managing agencies have been permitted to enter into multi-year binding authority agreements that can run for up to three years. And this year, Lloyd's plans to offer the option for continuous contracts that run indefinitely until termination.
              </p>

              <p>
                This aligns with the broader market for capacity, in which larger MGAs in particular have been able to negotiate longer term capacity arrangements with carriers.
              </p>

              <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Streamlined Accreditation</h2>

              <p>
                Another widely held preconception is that Lloyd's coverholder accreditation is a lengthy and complex process. It need not be so. The delegated authorities team at Lloyd's can process coverholder applications within a few days. The due diligence performed by the Lloyd's managing agent may take much longer, but this is not fundamentally different from the process an insurance company would require.
              </p>

              <p>
                For FASE members, Lloyd's has provided two valuable guides:
              </p>

              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>The first charts the scale, composition and growth rate of Lloyd's coverholder business across nine European markets.</li>
                <li>The second explains the benefits of becoming a Lloyd's coverholder and how they are remunerated and regulated.</li>
              </ul>

              <p>
                One hundred and twenty-three years after Cuthbert Heath first lent his pen to his trusted agent in Amsterdam, Lloyd's delegated authority business is still driven by the same motivation. In the words of Lloyd's guide, it permits access to "business that otherwise would not be seen or could not be written economically at the box." But the relationship between Lloyd's managing agencies and modern MGAs is today more balanced and the delegation of authority is, often, much broader.
              </p>
            </div>

            {/* Footer note */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 italic">
                Future issues will include interviews with chief underwriting officers at Lloyd's. Callum Alexander, director of delegated authority at Lloyd's, will be attending the MGA Rendezvous in May.
              </p>
            </div>
          </div>

          {/* Back link */}
          <div className="pb-12">
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
