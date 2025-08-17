'use client'

import { RsvpForm } from '@/components/rsvp/rsvp-form'

// Mock data for demonstration
const mockGuest = {
  id: 'demo-guest-1',
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
  eventId: 'demo-event-1',
  token: 'demo-token',
  invitationStatus: 'sent',
  invitationSentAt: new Date(),
  invitationMethod: 'email' as const,
  notes: null,
  rsvpStatus: null,
  guestCount: null,
  maxGuests: 5,
  rsvp: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockEvent = {
  id: 'demo-event-1',
  name: 'Sarah & Mike\'s Wedding',
  date: '2025-06-15',
  time: '16:00',
  location: 'Grand Ballroom, Hilton Hotel',
  description: 'Join us for a beautiful wedding celebration',
  organizerEmail: 'organizer@example.com'
}

export default function RsvpDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Event Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {mockEvent.name}
          </h1>
          <div className="text-lg text-gray-600">
            <p>{mockEvent.date} at {mockEvent.time}</p>
            <p>{mockEvent.location}</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <p className="text-lg text-gray-700">
            Hello <span className="font-semibold">{mockGuest.name}</span>!
          </p>
          <p className="text-gray-600 mt-2">
            You're invited to celebrate with us. Please let us know if you can make it.
          </p>
        </div>

        {/* RSVP Form */}
        <RsvpForm 
          guest={mockGuest} 
          event={mockEvent}
          onSuccess={() => console.log('Success!')}
          onError={(error) => console.error('Error:', error)}
        />
      </div>
    </div>
  )
}