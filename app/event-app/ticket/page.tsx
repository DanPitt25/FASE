'use client';

import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';
import { QRCodeSVG } from 'qrcode.react';

interface TicketData {
  registrationId: string;
  company: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketType: string;
  isFaseMember: boolean;
}

export default function TicketPage() {
  const { user, member } = useUnifiedAuth();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(1);

  // Fetch ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/event-app/ticket?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const data = await response.json();
          setTicket(data);
        } else if (response.status === 404) {
          setError('No registration found for your email.');
        } else {
          setError('Unable to load ticket. Please try again.');
        }
      } catch (err) {
        setError('Unable to load ticket. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [user?.email]);

  // Increase brightness when viewing ticket (for scanning)
  const handleBrightnessToggle = () => {
    setBrightness(brightness === 1 ? 1.5 : 1);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-6xl mb-4">🎫</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to view your event ticket.
            </p>
            <a
              href="/login"
              className="inline-block bg-fase-navy text-white px-6 py-3 rounded-lg font-medium hover:bg-fase-navy/90 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-6xl mb-4">🎟️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">No Ticket Found</h1>
            <p className="text-gray-600 mb-6">
              {error || 'We couldn\'t find a registration for your account.'}
            </p>
            <a
              href="https://mgarendezvous.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-fase-navy text-white px-6 py-3 rounded-lg font-medium hover:bg-fase-navy/90 transition-colors"
            >
              Register Now
            </a>
          </div>
        </div>
      </div>
    );
  }

  // QR code data - contains registration ID for check-in
  const qrData = JSON.stringify({
    type: 'MGA_RENDEZVOUS_2026',
    id: ticket.registrationId,
    email: ticket.attendeeEmail,
  });

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-fase-navy text-white px-4 py-6">
        <h1 className="text-xl font-bold">My Ticket</h1>
        <p className="text-white/70 text-sm">MGA Rendezvous 2026</p>
      </div>

      {/* Ticket Card */}
      <div className="px-4 -mt-4">
        <div
          className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-sm mx-auto"
          style={{ filter: `brightness(${brightness})` }}
        >
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-fase-navy to-fase-navy/80 text-white p-6 text-center">
            <h2 className="text-lg font-bold">MGA Rendezvous 2026</h2>
            <p className="text-white/80 text-sm">Barcelona • May 11-12</p>
          </div>

          {/* QR Code */}
          <div className="p-6 flex flex-col items-center">
            <button
              onClick={handleBrightnessToggle}
              className="p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-fase-navy/20 transition-colors"
            >
              <QRCodeSVG
                value={qrData}
                size={180}
                level="H"
                includeMargin={false}
              />
            </button>
            <p className="text-xs text-gray-500 mt-3">Tap to brighten for scanning</p>
          </div>

          {/* Divider with circles */}
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
            <div className="border-t-2 border-dashed border-gray-200 mx-6"></div>
          </div>

          {/* Ticket Details */}
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Attendee</p>
              <p className="font-semibold text-gray-900">{ticket.attendeeName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Company</p>
              <p className="font-medium text-gray-700">{ticket.company}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Ticket Type</p>
                <p className="font-medium text-gray-700">{ticket.ticketType}</p>
              </div>
              {ticket.isFaseMember && (
                <div className="flex-shrink-0">
                  <span className="inline-block bg-fase-gold/20 text-fase-orange text-xs font-medium px-2 py-1 rounded">
                    FASE Member
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Registration ID</p>
              <p className="font-mono text-sm text-gray-600">{ticket.registrationId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-8 max-w-sm mx-auto">
        <h3 className="font-medium text-gray-900 mb-3">At the Event</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-fase-navy">1.</span>
            Show this QR code at registration
          </li>
          <li className="flex gap-2">
            <span className="text-fase-navy">2.</span>
            Collect your badge and welcome pack
          </li>
          <li className="flex gap-2">
            <span className="text-fase-navy">3.</span>
            Save this page for offline access
          </li>
        </ul>
      </div>
    </div>
  );
}
