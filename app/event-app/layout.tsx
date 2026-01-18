'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';

// Bottom navigation items for attendees
const attendeeNavItems = [
  { href: '/event-app', label: 'Home', icon: HomeIcon },
  { href: '/event-app/schedule', label: 'Schedule', icon: CalendarIcon },
  { href: '/event-app/ticket', label: 'Ticket', icon: TicketIcon },
  { href: '/event-app/attendees', label: 'Network', icon: UsersIcon },
  { href: '/event-app/venue', label: 'Venue', icon: MapIcon },
];

// Admin gets an extra tab
const adminNavItems = [
  ...attendeeNavItems.slice(0, 4),
  { href: '/event-app/admin', label: 'Admin', icon: ShieldIcon },
];

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function EventAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin } = useUnifiedAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const navItems = isAdmin ? adminNavItems : attendeeNavItems;

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // Check if running as installed PWA
  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(isInstalled);
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show install banner after a short delay
      setTimeout(() => setShowInstallBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* PWA Meta Tags */}
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rendezvous" />
        <link rel="apple-touch-icon" href="/pwa/icon-192.png" />
        <meta name="theme-color" content="#2D5574" />
        <link rel="manifest" href="/manifest.json" />
      </head>

      {/* Install Banner */}
      {showInstallBanner && !isStandalone && !sessionStorage.getItem('pwa-install-dismissed') && (
        <div className="bg-fase-navy text-white px-4 py-3 flex items-center justify-between gap-3 safe-area-top">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install the app for the best experience</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="bg-white text-fase-navy px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              Install
            </button>
            <button
              onClick={dismissInstallBanner}
              className="text-white/70 p-1"
              aria-label="Dismiss"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20 safe-area-bottom">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/event-app' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-fase-navy'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'stroke-2' : ''}`} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Safe area styles */}
      <style jsx global>{`
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        @supports (padding: max(0px)) {
          .pb-20 {
            padding-bottom: max(5rem, calc(4rem + env(safe-area-inset-bottom)));
          }
        }
      `}</style>
    </div>
  );
}

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
