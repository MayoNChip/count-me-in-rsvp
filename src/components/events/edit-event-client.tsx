'use client'

import { useRouter } from 'next/navigation'
import { EventEditForm } from '@/components/forms/event-edit-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Event = {
  id: string
  name: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  organizerEmail: string
  createdAt: Date
  updatedAt: Date
}

interface EditEventClientProps {
  event: Event
}

export function EditEventClient({ event }: EditEventClientProps) {
  const router = useRouter()

  const handleSuccess = (eventId: string) => {
    // Redirect back to event details
    router.push(`/admin/event/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-soft">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-12">
          <Link href={`/admin/event/${event.id}`}>
            <Button size="sm" className="mb-8 btn-clean">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ← Back to Event
            </Button>
          </Link>
          
          <div className="text-center mb-12 slide-up">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-amber-500 to-lime-600 bg-clip-text text-transparent mb-4">
              Edit Event
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Update your event details and keep your guests informed
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <EventEditForm 
            event={event}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  )
}