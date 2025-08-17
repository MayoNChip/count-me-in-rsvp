import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/data/events'
import { getGuestsByEvent } from '@/lib/data/guests'
import { GuestManagement } from '@/components/guests/guest-management'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// This would normally come from authentication
const ORGANIZER_EMAIL = 'test@example.com'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GuestsPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-soft">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-12">
          <Link href={`/admin/event/${id}`}>
            <Button size="sm" className="mb-8 btn-clean">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ← Back to Event
            </Button>
          </Link>
        </div>

        <Suspense fallback={<GuestManagementSkeleton />}>
          <GuestManagementWrapper eventId={id} />
        </Suspense>
      </div>
    </div>
  )
}

async function GuestManagementWrapper({ eventId }: { eventId: string }) {
  const [event, guests] = await Promise.all([
    getEventById(eventId),
    getGuestsByEvent(eventId)
  ])

  if (!event) {
    notFound()
  }

  // Authorization check removed - showing all events for development/testing

  return <GuestManagement event={event} guests={guests} />
}

function GuestManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="modern-card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
      <div className="modern-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}