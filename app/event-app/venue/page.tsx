'use client';

import Link from 'next/link';

export default function VenuePage() {
  return (
    <div className="min-h-full bg-gray-50">
      {/* Header Image */}
      <div className="relative h-48 bg-fase-navy">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('/hotel_pool.jpeg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">Venue Information</h1>
          <p className="text-white/80">Hotel Arts Barcelona</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Hotel Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Hotel Arts Barcelona</h2>
            <p className="text-sm text-gray-600 mb-4">
              A luxury beachfront hotel overlooking the Mediterranean, walking distance to the city center and close to Barcelona international airport.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-gray-400">📍</span>
                <span className="text-gray-700">Marina 19-21, 08005 Barcelona, Spain</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400">📞</span>
                <span className="text-gray-700">+34 93 221 1000</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 p-4 flex gap-3">
            <a
              href="https://maps.google.com/?q=Hotel+Arts+Barcelona"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-gray-100 rounded-lg text-center text-sm font-medium text-gray-700"
            >
              Get Directions
            </a>
            <a
              href="https://www.marriott.com/en-gb/event-reservations/reservation-link.mi?id=1767784681245&key=GRP"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-fase-navy rounded-lg text-center text-sm font-medium text-white"
            >
              Book Room
            </a>
          </div>
        </div>

        {/* Event Spaces */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Event Spaces</h2>
          <div className="space-y-3">
            <VenueCard
              name="Grand Ballroom"
              description="Main conference sessions and panels"
              floor="Level 1"
            />
            <VenueCard
              name="Meeting Rooms"
              description="Structured networking sessions"
              floor="Level 1"
            />
            <VenueCard
              name="Terrace"
              description="Coffee breaks and informal networking"
              floor="Level 1"
            />
            <VenueCard
              name="Restaurant"
              description="Lunch and dining"
              floor="Ground Floor"
            />
            <VenueCard
              name="Poolside Terrace"
              description="Gala dinner (Day 1 evening)"
              floor="Ground Floor"
            />
          </div>
        </div>

        {/* Getting There */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Getting There</h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            <TransportOption
              icon="✈️"
              title="From Barcelona Airport (BCN)"
              details="30 min by taxi • 45 min by Aerobus + Metro"
            />
            <TransportOption
              icon="🚄"
              title="From Barcelona Sants Station"
              details="15 min by taxi • 25 min by Metro (L3 + L4)"
            />
            <TransportOption
              icon="🚇"
              title="Nearest Metro"
              details="Ciutadella Vila Olímpica (L4 Yellow Line)"
            />
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Event Contact</h2>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-3">
              For any questions about the venue or event logistics:
            </p>
            <a
              href="mailto:rendezvous@fasemga.com"
              className="inline-flex items-center gap-2 text-fase-navy font-medium"
            >
              <span>✉️</span>
              rendezvous@fasemga.com
            </a>
          </div>
        </div>

        {/* Quick Tips */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Good to Know</h2>
          <div className="bg-fase-cream rounded-xl p-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span>🌡️</span>
                <span>Weather in May: 18-23°C (64-73°F), light layers recommended</span>
              </li>
              <li className="flex gap-2">
                <span>👔</span>
                <span>Dress code: Business casual for sessions, smart casual for dinner</span>
              </li>
              <li className="flex gap-2">
                <span>🔌</span>
                <span>Power outlets: Type C/F (European standard)</span>
              </li>
              <li className="flex gap-2">
                <span>💶</span>
                <span>Currency: Euro (€)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function VenueCard({
  name,
  description,
  floor,
}: {
  name: string;
  description: string;
  floor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
        {floor}
      </span>
    </div>
  );
}

function TransportOption({
  icon,
  title,
  details,
}: {
  icon: string;
  title: string;
  details: string;
}) {
  return (
    <div className="p-4 flex items-start gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{details}</p>
      </div>
    </div>
  );
}
