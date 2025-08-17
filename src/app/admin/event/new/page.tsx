'use client'

import { useRouter } from 'next/navigation'
import { EventForm } from '@/components/forms/event-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// This would normally come from authentication
const ORGANIZER_EMAIL = 'idoic4@gmail.com' // Updated to match your primary events

export default function NewEventPage() {
  const router = useRouter()

  const handleSuccess = (eventId: string) => {
    // Redirect to event details or back to dashboard
    router.push(`/admin/event/${eventId}`)
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-12">
          <Link href="/admin">
            <Button size="sm" className="mb-8 btn-clean">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ← Back to Dashboard
            </Button>
          </Link>
          
          <div className="text-center mb-12 slide-up">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-amber-500 to-lime-600 bg-clip-text text-transparent mb-4">
              Create New Event
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Ready to plan something amazing? Let&apos;s set up your event and start collecting RSVPs with style.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <EventForm 
            organizerEmail={ORGANIZER_EMAIL}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  )
}