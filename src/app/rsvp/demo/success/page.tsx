import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, MapPin, Clock, Heart } from 'lucide-react'
import Link from 'next/link'

// Mock data for demonstration
const mockEvent = {
  id: 'demo-event-1',
  name: 'Sarah & Mike\'s Wedding',
  date: '2025-06-15',
  time: '16:00',
  location: 'Grand Ballroom, Hilton Hotel',
  description: 'Join us for a beautiful wedding celebration'
}

const mockResponse = {
  status: 'yes' as const,
  numOfGuests: 2,
  guestNames: 'Jane Doe',
  message: 'Can\'t wait to celebrate with you both!'
}

export default function RsvpDemoSuccessPage() {
  const responseDetails = {
    emoji: '🎉',
    title: 'See You There!',
    message: 'We\'re excited to celebrate with you!',
    color: 'green'
  }

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
                <div className="w-20 h-1 bg-green-500 rounded-full opacity-20"></div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {responseDetails.title}
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              {responseDetails.message}
            </p>

            {/* Response Summary */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 mb-4">Your Response Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium capitalize text-green-600">
                    Attending
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Number of Guests:</span>
                  <span className="font-medium">{mockResponse.numOfGuests}</span>
                </div>
                
                <div className="flex items-start justify-between">
                  <span className="text-gray-600">Guest Names:</span>
                  <span className="font-medium text-right ml-4">{mockResponse.guestNames}</span>
                </div>
                
                <div className="pt-3 border-t">
                  <p className="text-gray-600 mb-1">Your Message:</p>
                  <p className="text-gray-800 italic">"{mockResponse.message}"</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/rsvp/demo">
                <Button variant="default" size="lg" className="w-full sm:w-auto">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Update My Response
                </Button>
              </Link>
              
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Calendar className="mr-2 h-4 w-4" />
                Add to Calendar
              </Button>
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
                  <p className="font-medium text-gray-900">{mockEvent.name}</p>
                  <p className="text-gray-600">
                    Sunday, June 15, 2025
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Time</p>
                  <p className="text-gray-600">4:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Location</p>
                  <p className="text-gray-600">{mockEvent.location}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">About</p>
                  <p className="text-gray-600">{mockEvent.description}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-sm text-gray-600">
                Need to make changes or have questions?
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Contact the event organizer or{' '}
                <Link href="/rsvp/demo" className="text-purple-600 hover:underline">
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