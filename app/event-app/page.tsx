'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';

export default function EventAppHome() {
  const { user, isAdmin } = useUnifiedAuth();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  // Event date: May 11, 2026
  const eventDate = new Date('2026-05-11T09:00:00+02:00');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown({ days, hours, minutes });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const quickLinks = [
    { href: '/event-app/schedule', label: 'View Schedule', icon: '📅', color: 'bg-blue-50 text-blue-700' },
    { href: '/event-app/ticket', label: 'My Ticket', icon: '🎫', color: 'bg-purple-50 text-purple-700' },
    { href: '/event-app/attendees', label: 'Networking', icon: '🤝', color: 'bg-green-50 text-green-700' },
    { href: '/event-app/venue', label: 'Venue Info', icon: '📍', color: 'bg-orange-50 text-orange-700' },
  ];

  const isEventLive = new Date() >= eventDate;

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-fase-navy to-fase-navy/90 text-white px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Image
              src="/fase-logo-mark.png"
              alt="FASE"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold">MGA Rendezvous</h1>
              <p className="text-white/70 text-sm">Barcelona 2026</p>
            </div>
          </div>

          {/* Countdown */}
          {!isEventLive ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
              <p className="text-white/70 text-sm mb-3 text-center">Event starts in</p>
              <div className="flex justify-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{countdown.days}</div>
                  <div className="text-xs text-white/60">days</div>
                </div>
                <div className="text-2xl font-light text-white/40">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{countdown.hours}</div>
                  <div className="text-xs text-white/60">hours</div>
                </div>
                <div className="text-2xl font-light text-white/40">:</div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{countdown.minutes}</div>
                  <div className="text-xs text-white/60">min</div>
                </div>
              </div>
              <p className="text-center text-white/60 text-sm mt-4">May 11-12, 2026</p>
            </div>
          ) : (
            <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-green-400/30">
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-100 font-semibold">Event is Live!</span>
              </div>
            </div>
          )}

          {/* Welcome message */}
          {user && (
            <p className="text-white/80 text-center">
              Welcome back! Check the schedule for today&apos;s sessions.
            </p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-4 -mt-6">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${link.color} rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow`}
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Quick Access */}
      {isAdmin && (
        <div className="px-4 mt-6">
          <div className="max-w-lg mx-auto">
            <Link
              href="/event-app/admin"
              className="block bg-fase-navy/5 border-2 border-dashed border-fase-navy/20 rounded-xl p-4 text-center hover:bg-fase-navy/10 transition-colors"
            >
              <span className="text-fase-navy font-medium">Admin Dashboard</span>
              <p className="text-fase-navy/60 text-sm mt-1">Check-in, tasks, and more</p>
            </Link>
          </div>
        </div>
      )}

      {/* Announcements / Updates Section */}
      <div className="px-4 mt-8">
        <div className="max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Updates</h2>

          <div className="space-y-3">
            <AnnouncementCard
              title="Welcome to MGA Rendezvous 2026"
              message="The first pan-European networking forum for MGAs and capacity providers."
              time="Event info"
              type="info"
            />
            <AnnouncementCard
              title="Hotel Booking Available"
              message="Book your stay at Hotel Arts Barcelona with our group rate."
              time="Accommodation"
              type="action"
              actionUrl="https://www.marriott.com/en-gb/event-reservations/reservation-link.mi?id=1767784681245&key=GRP"
              actionLabel="Book Now"
            />
          </div>
        </div>
      </div>

      {/* Sponsors Preview */}
      <div className="px-4 mt-8 mb-8">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-gray-500 text-sm">Sponsored by</p>
          <div className="flex justify-center items-center mt-3">
            <div className="text-gray-400 text-sm">Howden</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementCard({
  title,
  message,
  time,
  type = 'info',
  actionUrl,
  actionLabel,
}: {
  title: string;
  message: string;
  time: string;
  type?: 'info' | 'action' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
}) {
  const bgColors = {
    info: 'bg-white',
    action: 'bg-fase-cream',
    urgent: 'bg-red-50',
  };

  const borderColors = {
    info: 'border-gray-100',
    action: 'border-fase-gold/30',
    urgent: 'border-red-200',
  };

  return (
    <div className={`${bgColors[type]} ${borderColors[type]} border rounded-xl p-4`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{message}</p>
      {actionUrl && (
        <a
          href={actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-fase-navy hover:underline"
        >
          {actionLabel} →
        </a>
      )}
    </div>
  );
}
