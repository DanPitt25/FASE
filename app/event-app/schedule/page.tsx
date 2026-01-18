'use client';

import { useState } from 'react';

// Event schedule data - would come from API in production
const scheduleData = {
  '2026-05-11': {
    date: 'Monday, May 11',
    sessions: [
      {
        id: '1',
        time: '08:30',
        endTime: '09:30',
        title: 'Registration & Welcome Coffee',
        type: 'networking',
        location: 'Main Lobby',
      },
      {
        id: '2',
        time: '09:30',
        endTime: '10:00',
        title: 'Opening Remarks',
        type: 'keynote',
        location: 'Grand Ballroom',
        speakers: ['FASE Leadership', 'ASASE Leadership'],
      },
      {
        id: '3',
        time: '10:00',
        endTime: '11:00',
        title: 'Capacity Options and Diversification for European MGAs',
        type: 'panel',
        location: 'Grand Ballroom',
        description: 'Exploring the evolving landscape of capacity providers for European MGAs.',
      },
      {
        id: '4',
        time: '11:00',
        endTime: '11:30',
        title: 'Coffee Break & Networking',
        type: 'break',
        location: 'Terrace',
      },
      {
        id: '5',
        time: '11:30',
        endTime: '12:30',
        title: 'AI-Powered Technologies to Enhance MGA Performance',
        type: 'panel',
        location: 'Grand Ballroom',
        description: 'How artificial intelligence is transforming MGA operations.',
      },
      {
        id: '6',
        time: '12:30',
        endTime: '14:00',
        title: 'Networking Lunch',
        type: 'networking',
        location: 'Restaurant',
      },
      {
        id: '7',
        time: '14:00',
        endTime: '15:00',
        title: 'US MGA Market Lessons for Europe',
        type: 'panel',
        location: 'Grand Ballroom',
        description: 'What European MGAs can learn from the mature US market.',
      },
      {
        id: '8',
        time: '15:00',
        endTime: '15:30',
        title: 'Afternoon Break',
        type: 'break',
        location: 'Terrace',
      },
      {
        id: '9',
        time: '15:30',
        endTime: '16:30',
        title: 'Structured Networking Sessions',
        type: 'networking',
        location: 'Meeting Rooms',
        description: 'Pre-arranged meetings based on your risk appetite and expertise.',
      },
      {
        id: '10',
        time: '19:00',
        endTime: '23:00',
        title: 'Gala Dinner',
        type: 'social',
        location: 'Poolside Terrace',
      },
    ],
  },
  '2026-05-12': {
    date: 'Tuesday, May 12',
    sessions: [
      {
        id: '11',
        time: '09:00',
        endTime: '09:30',
        title: 'Morning Coffee',
        type: 'networking',
        location: 'Main Lobby',
      },
      {
        id: '12',
        time: '09:30',
        endTime: '10:30',
        title: 'Regulatory Fragmentation: Challenges and Solutions',
        type: 'panel',
        location: 'Grand Ballroom',
        description: 'Navigating the complex European regulatory landscape.',
      },
      {
        id: '13',
        time: '10:30',
        endTime: '11:00',
        title: 'Coffee Break',
        type: 'break',
        location: 'Terrace',
      },
      {
        id: '14',
        time: '11:00',
        endTime: '12:00',
        title: 'Structured Networking Sessions',
        type: 'networking',
        location: 'Meeting Rooms',
        description: 'Continue your scheduled meetings.',
      },
      {
        id: '15',
        time: '12:00',
        endTime: '12:30',
        title: 'Closing Remarks & Next Steps',
        type: 'keynote',
        location: 'Grand Ballroom',
      },
      {
        id: '16',
        time: '12:30',
        endTime: '14:00',
        title: 'Farewell Lunch',
        type: 'networking',
        location: 'Restaurant',
      },
    ],
  },
};

type SessionType = 'keynote' | 'panel' | 'networking' | 'break' | 'social';

const typeStyles: Record<SessionType, { bg: string; text: string; label: string }> = {
  keynote: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Keynote' },
  panel: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Panel' },
  networking: { bg: 'bg-green-100', text: 'text-green-700', label: 'Networking' },
  break: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Break' },
  social: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Social' },
};

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState<'2026-05-11' | '2026-05-12'>('2026-05-11');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const dayData = scheduleData[selectedDay];

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
        </div>

        {/* Day Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          <button
            onClick={() => setSelectedDay('2026-05-11')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              selectedDay === '2026-05-11'
                ? 'bg-fase-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Day 1 - May 11
          </button>
          <button
            onClick={() => setSelectedDay('2026-05-12')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              selectedDay === '2026-05-12'
                ? 'bg-fase-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Day 2 - May 12
          </button>
        </div>
      </div>

      {/* Schedule List */}
      <div className="px-4 py-4">
        <div className="space-y-3">
          {dayData.sessions.map((session) => {
            const style = typeStyles[session.type as SessionType];
            const isExpanded = expandedSession === session.id;

            return (
              <div
                key={session.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex gap-4">
                    {/* Time */}
                    <div className="flex-shrink-0 w-14">
                      <div className="text-sm font-semibold text-gray-900">{session.time}</div>
                      <div className="text-xs text-gray-500">{session.endTime}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-gray-900">{session.title}</h3>
                        <span className={`${style.bg} ${style.text} text-xs px-2 py-0.5 rounded-full flex-shrink-0`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{session.location}</p>
                      {session.speakers && (
                        <p className="text-sm text-gray-600 mt-1">
                          {session.speakers.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && session.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{session.description}</p>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(typeStyles).map(([key, style]) => (
            <span key={key} className={`${style.bg} ${style.text} text-xs px-2 py-1 rounded-full`}>
              {style.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
