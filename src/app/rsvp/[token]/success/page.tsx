import React from 'react'
import { Metadata } from 'next'
import { getRsvpPageData } from '@/app/actions/rsvp'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, MapPin, Clock, Users, Heart, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface SuccessPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: SuccessPageProps): Promise<Metadata> {
  const { token } = await params
  const result = await getRsvpPageData(token)
  
  if (!result.success || !result.data) {
    return {
      title: 'RSVP Confirmation',
      description: 'Your RSVP has been received'
    }
  }

  const { event } = result.data

  return {
    title: `RSVP Confirmed - ${event.name}`,
    description: `Your RSVP for ${event.name} has been received`,
    robots: 'noindex, nofollow'
  }
}

export default async function RsvpSuccessPage({ params }: SuccessPageProps) {
  const { token } = await params
  const result = await getRsvpPageData(token)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md modern-card border-0">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600">
              We couldn't load your RSVP details. Please contact the event organizer.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { guest, event } = result.data

  // Determine the appropriate emoji and message based on response
  const getResponseDetails = () => {
    if (!guest.rsvp) {
      return {
        emoji: '❓',
        title: 'No Response Yet',
        message: 'You haven\'t submitted your RSVP yet.',
        color: 'gray'
      }
    }

    switch (guest.rsvp.status) {
      case 'yes':
        return {
          emoji: '🎉',
          title: 'See You There!',
          message: 'We\'re excited to celebrate with you!',
          color: 'green'
        }
      case 'no':
        return {
          emoji: '💙',
          title: 'We\'ll Miss You!',
          message: 'Thank you for letting us know. We\'ll miss having you there!',
          color: 'blue'
        }
      case 'maybe':
        return {
          emoji: '🤞',
          title: 'Hope You Can Make It!',
          message: 'We hope you\'ll be able to join us! Feel free to update your response anytime.',
          color: 'amber'
        }
      default:
        return {
          emoji: '✅',
          title: 'RSVP Received',
          message: 'Thank you for your response!',
          color: 'gray'
        }
    }
  }

  const responseDetails = getResponseDetails()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Success Card */}
        <Card className="modern-card border-0 mb-6">
          <CardContent className="text-center py-12">
            {/* Animated Success Icon */}
            <div className="relative mb-6">
              <div className="text-8xl animate-bounce">{responseDetails.emoji}</div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className={`w-20 h-1 bg-${responseDetails.color}-500 rounded-full opacity-20`}></div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {responseDetails.title}
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              {responseDetails.message}
            </p>

            {/* Response Summary */}
            {guest.rsvp && (
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-900 mb-4">Your Response Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium capitalize text-${responseDetails.color}-600`}>
                      {guest.rsvp.status === 'yes' ? 'Attending' :
                       guest.rsvp.status === 'no' ? 'Not Attending' : 'Maybe'}
                    </span>
                  </div>
                  
                  {guest.rsvp.numOfGuests > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Number of Guests:</span>
                      <span className="font-medium">{guest.rsvp.numOfGuests}</span>
                    </div>
                  )}
                  
                  {guest.rsvp.guestNames && (
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600">Guest Names:</span>
                      <span className="font-medium text-right ml-4">{guest.rsvp.guestNames}</span>
                    </div>
                  )}
                  
                  {guest.rsvp.message && (
                    <div className="pt-3 border-t">
                      <p className="text-gray-600 mb-1">Your Message:</p>
                      <p className="text-gray-800 italic">"{guest.rsvp.message}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/rsvp/${token}`}>
                <Button variant="default" size="lg" className="w-full sm:w-auto">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Update My Response
                </Button>
              </Link>
              
              {guest.rsvp?.status === 'yes' && (
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Calendar className="mr-2 h-4 w-4" />
                  Add to Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event Details Card */}
        <Card className="modern-card border-0">
          <CardContent className="py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Event Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-gray-600">
                    {format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              {event.time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Time</p>
                    <p className="text-gray-600">{event.time}</p>
                  </div>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>
              )}
              
              {event.description && (
                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">About</p>
                    <p className="text-gray-600">{event.description}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-gray-600">
                Need to make changes or have questions?
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Contact the event organizer or{' '}
                <Link href={`/rsvp/${token}`} className="text-purple-600 hover:underline">
                  update your RSVP
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}