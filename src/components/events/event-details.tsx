import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Edit, Trash2, Clock, Mail } from 'lucide-react'
import { formatDate } from 'date-fns'
import Link from 'next/link'

type EventWithStats = {
  id: string
  name: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  organizerEmail: string
  createdAt: Date
  updatedAt: Date
  stats: {
    totalInvited: number
    totalResponded: number
    totalYes: number
    totalNo: number
    totalMaybe: number
    totalPending: number
  }
}

interface EventDetailsProps {
  event: EventWithStats
}

export function EventDetails({ event }: EventDetailsProps) {
  const eventDate = new Date(event.date)
  const isUpcoming = eventDate > new Date()

  return (
    <div className="space-y-8 slide-up">
      {/* Header Section */}
      <div className="modern-card p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl font-bold text-slate-800">{event.name}</h1>
              <Badge 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isUpcoming 
                    ? 'bg-lime-500 text-white' 
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isUpcoming ? 'Upcoming' : 'Past'}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-lime">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg text-slate-700 font-medium">
                  {formatDate(eventDate, 'PPPP')}
                  {event.time && (
                    <span className="flex items-center gap-2 mt-1">
                      <div className="p-1 rounded-lg bg-amber">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-600">{event.time}</span>
                    </span>
                  )}
                </span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg text-slate-700">{event.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg text-slate-700">{event.organizerEmail}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Link href={`/admin/event/${event.id}/edit`}>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-xl px-6 hover-lift">
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </Button>
            </Link>
            
            <Button variant="destructive" className="rounded-xl px-6 hover-lift">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        
        {event.description && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Description</h3>
            <p className="text-slate-600 leading-relaxed">{event.description}</p>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="modern-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Invited</p>
              <p className="text-2xl font-bold text-slate-800">{event.stats.totalInvited}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="modern-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Attending</p>
              <p className="text-2xl font-bold text-slate-800">{event.stats.totalYes}</p>
            </div>
            <div className="p-3 rounded-2xl bg-green">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="modern-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Maybe</p>
              <p className="text-2xl font-bold text-slate-800">{event.stats.totalMaybe}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="modern-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-slate-800">{event.stats.totalPending}</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="modern-card p-8">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/admin/event/${event.id}/guests`}>
            <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl p-6 hover-lift">
              <Users className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Manage Guests</div>
                <div className="text-sm opacity-90">Add, edit, or remove guests</div>
              </div>
            </Button>
          </Link>
          
          <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-xl p-6 hover-lift">
            <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">Send Invitations</div>
              <div className="text-sm opacity-90">Email guests about your event</div>
            </div>
          </Button>
          
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white border-0 rounded-xl p-6 hover-lift">
            <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">View Reports</div>
              <div className="text-sm opacity-90">Analyze RSVP responses</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}