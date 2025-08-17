import { Suspense } from 'react'
import { getEvents } from '@/lib/data/events'
import { EventsList } from '@/components/events/events-list'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, CheckCircle } from 'lucide-react'
import Link from 'next/link'

// This would normally come from authentication
const ORGANIZER_EMAIL = 'idoic4@gmail.com'

export default async function AdminDashboard() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section - Dribbble inspired */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="slide-up">
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-2">
                Dashboard
              </h1>
              <p className="text-xl text-slate-600">
                Manage your events and RSVPs
              </p>
            </div>
            
            <Link href="/admin/event/new">
              <Button 
                size="lg" 
                className="bg-lime-500 hover:bg-lime-600 text-white border-0 px-8 py-4 rounded-2xl hover-lift shadow-lg text-lg font-medium"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 slide-up">
          <div className="modern-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Events</p>
                <p className="text-2xl font-bold text-slate-800">0</p>
              </div>
              <div className="p-3 rounded-2xl bg-lime">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="modern-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Guests</p>
                <p className="text-2xl font-bold text-slate-800">0</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="modern-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">RSVPs</p>
                <p className="text-2xl font-bold text-slate-800">0</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="slide-up">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Your Events</h2>
          </div>
          
          <Suspense fallback={<EventsListSkeleton />}>
            <EventsListWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function EventsListWrapper() {
  // Pass no email to show all events
  const events = await getEvents()
  
  return <EventsList events={events} />
}

function EventsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  )
}