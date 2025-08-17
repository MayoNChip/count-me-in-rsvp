'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { RsvpForm } from './rsvp-form'

interface Guest {
  id: string
  name: string
  phone: string | null
  email: string | null
  eventId: string
  token: string
  invitationStatus: string
  invitationSentAt: Date | null
  invitationMethod: string | null
  maxGuests: number
  notes: string | null
  rsvp?: {
    id: string
    status: string
    respondedAt: Date | null
    numOfGuests: number
    guestNames: string | null
    message: string | null
  } | null
  createdAt: Date
  updatedAt: Date
}

interface Event {
  id: string
  name: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  organizerEmail?: string
  createdAt?: Date
  updatedAt?: Date
}

interface RsvpFormWrapperProps {
  guest: Guest
  event: Event
}

export function RsvpFormWrapper({ guest, event }: RsvpFormWrapperProps) {
  const router = useRouter()
  
  return (
    <RsvpForm 
      guest={guest}
      event={event}
      onSuccess={() => {
        // Redirect to success page after a short delay to show success animation
        setTimeout(() => {
          router.push(`/rsvp/${guest.token}/success`)
        }, 1500)
      }}
      onError={(error) => {
        console.error('RSVP submission error:', error)
      }}
    />
  )
}