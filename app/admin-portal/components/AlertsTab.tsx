'use client';

import { useState } from 'react';
import { Alert, UserAlert } from '../../../lib/unified-messaging';
import Button from '../../../components/Button';

// Simple markdown renderer for alert content
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code `text`
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

interface AlertsTabProps {
  alerts: (Alert & UserAlert)[];
  pendingApplications: any[];
  pendingJoinRequests: any[];
  loading: boolean;
  onCreateAlert: () => void;
  onMarkAsRead: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
}

export default function AlertsTab({ 
  alerts, 
  pendingApplications,
  pendingJoinRequests,
  loading, 
  onCreateAlert,
  onMarkAsRead,
  onDismissAlert 
}: AlertsTabProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading alerts...</p>
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Administrative Alerts Section */}
      {(pendingApplications.length > 0 || pendingJoinRequests.length > 0) && (
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Administrative Alerts</h3>
          <div className="space-y-3">
            {pendingApplications.length > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    {pendingApplications.length} pending membership application{pendingApplications.length !== 1 ? 's' : ''} require{pendingApplications.length === 1 ? 's' : ''} review
                  </p>
                  <p className="text-xs text-yellow-600">Check the Members tab to review and process applications</p>
                </div>
              </div>
            )}
            
            {pendingJoinRequests.length > 0 && (
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    {pendingJoinRequests.length} employee join request{pendingJoinRequests.length !== 1 ? 's' : ''} pending approval
                  </p>
                  <p className="text-xs text-blue-600">Check the Join Requests tab to review employee access requests</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements */}
      {alerts.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
              Announcements ({alerts.filter(a => !a.isRead).length} unread)
            </h3>
            <Button 
              variant="primary" 
              size="small"
              onClick={onCreateAlert}
            >
              New Announcement
            </Button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${
                  alert.type === 'error' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                  alert.type === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                } ${!alert.isRead ? 'ring-2 ring-opacity-20 ring-current' : ''}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium mb-1 ${
                          alert.type === 'error' ? 'text-red-800' :
                          alert.type === 'warning' ? 'text-amber-800' :
                          alert.type === 'success' ? 'text-green-800' :
                          'text-blue-800'
                        }`}>
                          {alert.title}
                          {!alert.isRead && (
                            <span className="ml-2 text-xs bg-current text-white px-2 py-1 rounded-full">NEW</span>
                          )}
                        </h4>
                        <div 
                          className={`text-sm mb-2 ${
                            alert.type === 'error' ? 'text-red-700' :
                            alert.type === 'warning' ? 'text-amber-700' :
                            alert.type === 'success' ? 'text-green-700' :
                            'text-blue-700'
                          }`}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(alert.message) }}
                        />
                        <div className="flex items-center space-x-3 text-xs">
                          <span className={`px-2 py-1 rounded-full border ${getPriorityColor(alert.priority)}`}>
                            {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                          </span>
                          <span className="text-gray-500">
                            {formatDate(alert.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!alert.isRead && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => onMarkAsRead(alert.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => onDismissAlert(alert.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                    {alert.actionRequired && alert.actionUrl && (
                      <div className="mt-3">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => window.open(alert.actionUrl, '_blank')}
                        >
                          {alert.actionText || 'Take Action'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="mb-6">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
            <p className="text-gray-500 mb-6">Share updates, news, and important information with members.</p>
            <Button variant="primary" onClick={onCreateAlert}>
              Create First Announcement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}