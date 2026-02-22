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
          Source: Lloyd&apos;s
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
            src="/bulletin/feb-2026/lloyds-building.jpg"
            alt="Lloyd&apos;s of London"
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
                Lloyd&apos;s in Europe: Coverholder Business Growing Fast After 123 Years
              </h1>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-5xl mx-auto px-6">

          {/* Two column layout: Text | Charts */}
          <div className="py-10">
            <div className="lg:grid lg:grid-cols-5 lg:gap-16">
              {/* Text column */}
              <div className="lg:col-span-3 text-gray-700 leading-relaxed space-y-6">
                <p className="text-xl text-gray-800">
                  Ever since the pioneering Lloyd&apos;s underwriter, Cuthbert Heath, first granted a binding authority to his agent in Amsterdam, Alfred Schroder, in 1903, Lloyd&apos;s has played a key role in the development of Europe&apos;s delegated authority market.
                </p>

                <p>
                  Today, Lloyd&apos;s writes approximately <strong className="text-fase-navy">28% of its total premiums</strong> (€1,685m out of €5,939m) from the European Economic Area plus Switzerland on a delegated authority basis. Five hundred and thirty-two Lloyd&apos;s coverholders, including many of the region&apos;s leading MGAs, underwrite a wide array of business backed by Lloyd&apos;s binding authorities.
                </p>

                <p>
                  In recent years, Lloyd&apos;s managing agents&apos; delegated authority business in Europe has surged, growing by <strong className="text-fase-navy">15% annually</strong> between 2023 and 2025. The share of coverholder business in national markets varies widely. In Italy, Lloyd&apos;s 88 coverholders generated 61% of the market&apos;s total premium in 2025; in France the coverholder proportion was 43%; in Ireland, 28%; in Germany, 20%; and in Switzerland just 8%.
                </p>

                <p>
                  The overall figures are boosted by Lloyd&apos;s broad definition of what constitutes a coverholder, which includes 61 service companies owned and operated by Lloyd&apos;s managing agents. Coverholder business also includes business underwritten by consortia of Lloyd&apos;s syndicates, under which the lead syndicate operates with delegated authority from following syndicates.
                </p>

                <p>
                  Many Lloyd&apos;s coverholders are brokers with tightly worded binding authorities for particular classes of business. They operate as an efficient distribution channel for Lloyd&apos;s products but have little or no underwriting autonomy. But in common with insurance and reinsurance companies around the world, Lloyd&apos;s syndicates have also been increasing their capacity allocations to MGAs.
                </p>

                <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">No Longer Short-Termist</h2>

                <p>
                  Lloyd&apos;s capacity was historically tendered on a short-term – and often opportunistic - basis. But since 2016 Lloyd&apos;s managing agencies have been permitted to enter into multi-year binding authority agreements that can run for up to three years. And this year, Lloyd&apos;s plans to offer the option for continuous contracts that run indefinitely until termination.
                </p>

                <p>
                  This aligns with the broader market for capacity, in which larger MGAs in particular have been able to negotiate longer term capacity arrangements with carriers.
                </p>

                <h2 className="text-2xl font-noto-serif font-semibold text-fase-navy pt-4">Streamlined Accreditation</h2>

                <p>
                  Another widely held preconception is that Lloyd&apos;s coverholder accreditation is a lengthy and complex process. It need not be so. The delegated authorities team at Lloyd&apos;s can process coverholder applications within a few days. The due diligence performed by the Lloyd&apos;s managing agent may take much longer, but this is not fundamentally different from the process an insurance company would require.
                </p>

                <p>
                  For FASE members, Lloyd&apos;s has provided two valuable guides:
                </p>

                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>The first charts the scale, composition and growth rate of Lloyd&apos;s coverholder business across nine European markets.</li>
                  <li>The second explains the benefits of becoming a Lloyd&apos;s coverholder and how they are remunerated and regulated.</li>
                </ul>

                <p>
                  One hundred and twenty-three years after Cuthbert Heath first lent his pen to his trusted agent in Amsterdam, Lloyd&apos;s delegated authority business is still driven by the same motivation. In the words of Lloyd&apos;s guide, it permits access to &quot;business that otherwise would not be seen or could not be written economically at the box.&quot; But the relationship between Lloyd&apos;s managing agencies and modern MGAs is today more balanced and the delegation of authority is, often, much broader.
                </p>

                {/* Footer note */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 italic">
                    Future issues will include interviews with chief underwriting officers at Lloyd&apos;s. Callum Alexander, director of delegated authority at Lloyd&apos;s, will be attending the MGA Rendezvous in May.
                  </p>
                </div>
              </div>

              {/* Charts column */}
              <div className="lg:col-span-2 mt-10 lg:mt-0 space-y-8">
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-pie-chart.png"
                  alt="Lloyd&apos;s Binder Business breakdown by class"
                  title="Lloyd&apos;s Binder Business, EEA + Switzerland, 2025"
                  caption="Binder business by class. Total: €1.685bn"
                />
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-coverholder-count.png"
                  alt="Number of Lloyd&apos;s coverholders by country"
                  title="Accredited Lloyd&apos;s Coverholders by Country, 2025"
                  caption="Number of accredited coverholders by market"
                />
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-penetration.png"
                  alt="Coverholder penetration by market"
                  title="Coverholder Penetration by Market, 2025"
                  caption="Penetration ranges from 61% (Italy) to 8% (Switzerland)"
                />
              </div>
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
