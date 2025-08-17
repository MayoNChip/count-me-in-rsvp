import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/data/events'
import { EventDetails } from '@/components/events/event-details'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// This would normally come from authentication
const ORGANIZER_EMAIL = 'test@example.com'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-soft">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-12">
          <Link href="/admin">
            <Button size="sm" className="mb-8 btn-clean">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ← Back to Dashboard
            </Button>
          </Link>
        </div>

        <Suspense fallback={<EventDetailsSkeleton />}>
          <EventDetailsWrapper eventId={id} />
        </Suspense>
      </div>
    </div>
  )
}

async function EventDetailsWrapper({ eventId }: { eventId: string }) {
  const event = await getEventById(eventId)

  if (!event) {
    notFound()
  }

  // Authorization check removed - showing all events for development/testing

  return <EventDetails event={event} />
}

function EventDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="modern-card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="modern-card p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}