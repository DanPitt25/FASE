'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../../contexts/UnifiedAuthContext';

interface CheckInResult {
  success: boolean;
  attendee?: {
    name: string;
    company: string;
    email: string;
    ticketType: string;
    alreadyCheckedIn: boolean;
    checkedInAt?: string;
  };
  error?: string;
}

export default function CheckInPage() {
  const { isAdmin, loading } = useUnifiedAuth();
  const router = useRouter();
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/event-app');
    }
  }, [loading, isAdmin, router]);

  // Simple QR code scanning using camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const startScanning = async () => {
      if (!scanning || !videoRef.current || !canvasRef.current) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scan = async () => {
          if (!videoRef.current || !scanning) return;

          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);

          // In production, use a QR code library like jsQR
          // For now, we'll rely on manual entry or native camera app

          animationFrame = requestAnimationFrame(scan);
        };

        scan();
      } catch (error) {
        console.error('Camera access failed:', error);
        setScanning(false);
      }
    };

    if (scanning) {
      startScanning();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [scanning]);

  const handleCheckIn = async (registrationId: string) => {
    if (!registrationId.trim() || processing) return;

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/event-app/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: registrationId.trim() }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Vibrate on success (if supported)
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      });
    } finally {
      setProcessing(false);
      setManualId('');
    }
  };

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
        <h1 className="text-xl font-bold">Check-In</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Scanner Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Scan QR Code</h2>

          {scanning ? (
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                </div>
              </div>
              <button
                onClick={() => setScanning(false)}
                className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm"
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              onClick={() => setScanning(true)}
              className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 hover:border-fase-navy hover:bg-fase-navy/5 transition-colors"
            >
              <span className="text-4xl">📷</span>
              <span className="font-medium text-gray-700">Tap to Start Scanner</span>
              <span className="text-sm text-gray-500">Use camera to scan attendee QR codes</span>
            </button>
          )}
        </div>

        {/* Manual Entry */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Manual Entry</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Enter registration ID..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy"
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn(manualId)}
            />
            <button
              onClick={() => handleCheckIn(manualId)}
              disabled={!manualId.trim() || processing}
              className="px-4 py-2.5 bg-fase-navy text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? '...' : 'Check In'}
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div
            className={`rounded-xl p-4 ${
              result.success
                ? result.attendee?.alreadyCheckedIn
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {result.success && result.attendee ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {result.attendee.alreadyCheckedIn ? '⚠️' : '✅'}
                  </span>
                  <span className={`font-semibold ${
                    result.attendee.alreadyCheckedIn ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {result.attendee.alreadyCheckedIn ? 'Already Checked In' : 'Check-In Successful'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{result.attendee.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="text-gray-700">{result.attendee.company}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ticket Type</p>
                    <p className="text-gray-700">{result.attendee.ticketType}</p>
                  </div>
                  {result.attendee.alreadyCheckedIn && result.attendee.checkedInAt && (
                    <div>
                      <p className="text-xs text-gray-500">Checked In At</p>
                      <p className="text-gray-700">
                        {new Date(result.attendee.checkedInAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <span className="font-semibold text-red-800">
                  {result.error || 'Check-in failed'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recent Check-ins */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Tips</h2>
          <div className="bg-fase-cream rounded-xl p-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>💡</span>
                <span>Ask attendees to maximize screen brightness for easier scanning</span>
              </li>
              <li className="flex gap-2">
                <span>💡</span>
                <span>Registration ID is shown below the QR code on their ticket</span>
              </li>
              <li className="flex gap-2">
                <span>💡</span>
                <span>Yellow result means they&apos;ve already been checked in</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
