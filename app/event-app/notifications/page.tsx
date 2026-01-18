'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';

interface Notification {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
}

export default function NotificationsPage() {
  const { user, isAdmin, loading } = useUnifiedAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/event-app/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Check if browser supports notifications
  const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window;
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (supportsNotifications) {
      setNotificationPermission(Notification.permission);
    }
  }, [supportsNotifications]);

  const requestNotificationPermission = async () => {
    if (!supportsNotifications) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {isAdmin && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="bg-fase-navy text-white px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Permission Banner */}
      {supportsNotifications && notificationPermission !== 'granted' && (
        <div className="px-4 py-3 bg-fase-cream border-b border-fase-gold/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Push Notifications</p>
              <p className="text-xs text-gray-600">Get real-time updates during the event</p>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-1.5 bg-fase-navy text-white text-sm rounded-lg whitespace-nowrap"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="px-4 py-4">
        {loadingNotifications ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">🔔</span>
            <p className="text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Event updates will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{notification.title}</h3>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(notification.sentAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{notification.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Modal (Admin Only) */}
      {showBroadcastModal && isAdmin && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          onSent={() => {
            fetchNotifications();
            setShowBroadcastModal(false);
          }}
        />
      )}
    </div>
  );
}

function BroadcastModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/event-app/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });

      if (response.ok) {
        onSent();
      } else {
        alert('Failed to send notification');
      }
    } catch (error) {
      console.error('Failed to send broadcast:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        <div className="px-6 pb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Broadcast Notification</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Session Starting Soon"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g., The keynote session begins in 10 minutes in the Grand Ballroom"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy/20 focus:border-fase-navy resize-none"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              This will send a push notification to all attendees who have enabled notifications.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!title.trim() || !body.trim() || sending}
              className="flex-1 py-3 bg-fase-navy text-white rounded-lg font-medium disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send to All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
