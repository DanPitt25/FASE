'use client';

import { Message, UserMessage } from '../../../lib/unified-messaging';
import Button from '../../../components/Button';

interface MessagesTabProps {
  messages: (Message & UserMessage)[];
  loading: boolean;
  onCreateMessage: () => void;
  onMarkAsRead: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

export default function MessagesTab({ 
  messages, 
  loading, 
  onCreateMessage,
  onMarkAsRead,
  onDeleteMessage 
}: MessagesTabProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages</h3>
          <p className="text-gray-500 mb-6">Get started by sending your first message to users.</p>
          <Button variant="primary" onClick={onCreateMessage}>
            Create First Message
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getRecipientText = (recipientType: string) => {
    switch (recipientType) {
      case 'all_users': return 'All Users';
      case 'all_members': return 'All Members';
      case 'all_admins': return 'All Admins';
      case 'member_type': return 'Member Type';
      case 'specific_members': return 'Specific Members';
      default: return recipientType;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Messages ({messages.length})</h3>
        <Button 
          variant="primary" 
          size="small"
          onClick={onCreateMessage}
        >
          New Message
        </Button>
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
              message.isRead ? 'border-gray-200' : 'border-fase-navy bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className={`font-medium ${message.isRead ? 'text-gray-900' : 'text-fase-navy'}`}>
                    {message.subject}
                  </h4>
                  {!message.isRead && (
                    <span className="bg-fase-navy text-white text-xs px-2 py-1 rounded-full">New</span>
                  )}
                </div>
                
                <p className={`text-sm mb-3 ${message.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                  {message.content}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>To: {getRecipientText(message.recipientType)}</span>
                  <span>•</span>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {!message.isRead && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onMarkAsRead(message.id)}
                  >
                    Mark Read
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => onDeleteMessage(message.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}