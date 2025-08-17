import React from 'react'
import { Metadata } from 'next'
import { format, parseISO } from 'date-fns'
import { getRsvpPageData } from '@/app/actions/rsvp'
import { Clock, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventDetails } from '@/components/rsvp/event-details'
import { RsvpFormWrapper } from '@/components/rsvp/rsvp-form-wrapper'
import { InvitationDisplay } from '@/components/rsvp/invitation-display'

interface RsvpPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: RsvpPageProps): Promise<Metadata> {
  const { token } = await params
  const result = await getRsvpPageData(token)
  
  if (!result.success || !result.data) {
    return {
      title: 'RSVP Not Found',
      description: 'This RSVP link is invalid or has expired.'
    }
  }

  const { event } = result.data

  return {
    title: `RSVP - ${event.name}`,
    description: `RSVP for ${event.name} on ${format(parseISO(event.date), 'MMMM do, yyyy')}`,
    robots: 'noindex, nofollow' // Prevent indexing of personal RSVP pages
  }
}

export default async function RsvpPage({ params }: RsvpPageProps) {
  const { token } = await params
  const result = await getRsvpPageData(token)

  // Handle invalid token or other errors
  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md modern-card border-0">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">
              RSVP Link Not Found
            </CardTitle>
            <CardDescription className="text-slate-600">
              This RSVP link is invalid or has expired. Please contact the event organizer for a new invitation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { guest, event, canUpdate } = result.data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Count Me In</h1>
              <p className="text-sm text-slate-600">RSVP Response</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Invitation Image */}
        <InvitationDisplay 
          imageUrl={event.invitationImageUrl} 
          eventName={event.name}
        />

        {/* Event Details */}
        <div className="mb-6">
          <EventDetails event={event} />
        </div>

        {/* Guest Information */}
        <Card className="modern-card border-0 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
              <Users className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Invited: {guest.name}</p>
                <p className="text-sm text-amber-600">
                  You may bring up to {guest.maxGuests} guest{guest.maxGuests !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Status or Form */}
        {!canUpdate ? (
          <Card className="modern-card border-0">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-slate-600" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">
                Event Has Passed
              </CardTitle>
              <CardDescription className="text-slate-600">
                This event has already occurred. RSVP responses are no longer being accepted.
              </CardDescription>
            </CardHeader>
            {guest.rsvp && (
              <CardContent className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                  <span className="text-sm text-slate-600">Your response:</span>
                  <Badge className={
                    guest.rsvp.status === 'yes' ? 'bg-green-100 text-green-700 border-0' :
                    guest.rsvp.status === 'no' ? 'bg-red-100 text-red-700 border-0' :
                    'bg-amber-100 text-amber-700 border-0'
                  }>
                    {guest.rsvp.status === 'yes' ? 'Yes, I will attend' :
                     guest.rsvp.status === 'no' ? 'No, I cannot attend' :
                     'Maybe, I might attend'}
                  </Badge>
                </div>
              </CardContent>
            )}
          </Card>
        ) : (
          <Card className="modern-card border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800">
                {guest.rsvp ? 'Your Response' : 'Please Respond'}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {guest.rsvp 
                  ? 'You can update your response below if your plans have changed.'
                  : 'Let us know if you\'ll be able to join us for this special event.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Current Response Display */}
              {guest.rsvp && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Current Response:</span>
                    <Badge className={
                      guest.rsvp.status === 'yes' ? 'bg-green-100 text-green-700 border-0' :
                      guest.rsvp.status === 'no' ? 'bg-red-100 text-red-700 border-0' :
                      'bg-amber-100 text-amber-700 border-0'
                    }>
                      {guest.rsvp.status === 'yes' ? 'Yes' :
                       guest.rsvp.status === 'no' ? 'No' : 'Maybe'}
                    </Badge>
                  </div>
                  {guest.rsvp.numOfGuests > 0 && (
                    <p className="text-sm text-slate-600 mb-1">
                      Guests: {guest.rsvp.numOfGuests}
                    </p>
                  )}
                  {guest.rsvp.guestNames && (
                    <p className="text-sm text-slate-600 mb-1">
                      Names: {guest.rsvp.guestNames}
                    </p>
                  )}
                  {guest.rsvp.message && (
                    <p className="text-sm text-slate-600">
                      Message: "{guest.rsvp.message}"
                    </p>
                  )}
                  {guest.rsvp.respondedAt && (
                    <p className="text-xs text-slate-500 mt-2">
                      Responded: {format(new Date(guest.rsvp.respondedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}

              {/* RSVP Form */}
              <RsvpFormWrapper 
                guest={guest}
                event={event}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}