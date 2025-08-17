import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/data/events'
import { EditEventClient } from '@/components/events/edit-event-client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// This would normally come from authentication
const ORGANIZER_EMAIL = 'test@example.com'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params
  const event = await getEventById(id)

  if (!event) {
    notFound()
  }

  // Authorization check removed - allowing editing of all events for development/testing

  return <EditEventClient event={event} />
}