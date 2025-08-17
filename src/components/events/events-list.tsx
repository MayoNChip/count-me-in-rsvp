import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Edit, Trash2, Plus } from 'lucide-react'
import { formatDate } from 'date-fns'
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
  guestCount: number
}

interface EventsListProps {
  events: Event[]
}

export function EventsList({ events }: EventsListProps) {
  if (events.length === 0) {
    return (
      <div className="modern-card p-12 text-center">
        <div className="mb-8 bounce-subtle">
          <div className="inline-block p-8 rounded-3xl bg-purple shadow-lg">
            <Calendar className="h-16 w-16 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-4 text-slate-800">
          No events yet
        </h3>
        <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
          Create your first event to start collecting RSVPs and managing your celebrations
        </p>
        <Link href="/admin/event/new">
          <Button className="bg-purple-500 hover:bg-purple-600 text-white border-0 px-8 py-3 rounded-2xl hover-lift shadow-lg text-lg font-medium">
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Event
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.date)
  const isUpcoming = eventDate > new Date()

  return (
    <div className="modern-card p-6 hover-lift">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 mb-3">{event.name}</h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-lime">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span className="text-slate-700 font-medium">
                {formatDate(eventDate, 'PPP')}
                {event.time && ` at ${event.time}`}
              </span>
            </div>
            
            {event.location && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <span className="text-slate-600">{event.location}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isUpcoming 
                ? 'bg-lime-500 text-white' 
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isUpcoming ? 'Upcoming' : 'Past'}
          </Badge>
          
          <div className="flex gap-1">
            <Link href={`/admin/event/${event.id}/edit`}>
              <Button variant="ghost" size="sm" className="p-2 rounded-xl hover:bg-amber-50">
                <Edit className="h-4 w-4 text-amber-600" />
              </Button>
            </Link>
            
            <Button variant="ghost" size="sm" className="p-2 rounded-xl hover:bg-red-50">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
      
      {event.description && (
        <p className="text-slate-600 mb-6 p-4 bg-slate-50/50 rounded-2xl">
          {event.description}
        </p>
      )}
      
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-slate-700 font-medium">{event.guestCount} guest{event.guestCount !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="flex gap-3">
          <Link href={`/admin/event/${event.id}/guests`}>
            <Button 
              size="sm" 
              className="btn-clean px-4"
            >
              Manage Guests
            </Button>
          </Link>
          
          <Link href={`/admin/event/${event.id}`}>
            <Button 
              size="sm" 
              className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl px-4 hover-lift"
            >
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}