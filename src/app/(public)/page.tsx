import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Users, Calendar, MessageSquare, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-900">Count Me In</h1>
            </div>
            <Link href="/admin">
              <Button variant="outline">
                Event Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-6">
            Modern RSVP Management
            <span className="block text-lime-600">Made Simple</span>
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Streamline guest management and attendance tracking with our simple, 
            real-time interface for invitations and responses. Perfect for weddings, 
            parties, and celebrations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admin/event/new">
              <Button size="lg" className="bg-lime-600 hover:bg-lime-700 text-white px-8 py-4 text-lg">
                Create Your Event
                <Calendar className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Everything you need for perfect events
            </h3>
            <p className="text-xl text-slate-600">
              Say goodbye to RSVP chaos and hello to organized celebrations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calendar className="h-10 w-10 text-lime-600 mb-4" />
                <CardTitle>Easy Event Creation</CardTitle>
                <CardDescription>
                  Set up your event in minutes with our intuitive form. Add all the 
                  essential details your guests need to know.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-lime-600 mb-4" />
                <CardTitle>Smart Guest Management</CardTitle>
                <CardDescription>
                  Add guests individually or import in bulk. Track who's coming, 
                  who's not, and who hasn't responded yet.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-lime-600 mb-4" />
                <CardTitle>Real-Time Responses</CardTitle>
                <CardDescription>
                  Get instant updates when guests RSVP. No more chasing people 
                  down for responses or updating spreadsheets.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-lime-600 mb-4" />
                <CardTitle>Flexible Response Options</CardTitle>
                <CardDescription>
                  Yes, No, or Maybe responses with optional messages. Guests can 
                  update their status if plans change.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-lime-600 mb-4" />
                <CardTitle>Plus-One Support</CardTitle>
                <CardDescription>
                  Allow guests to bring additional people and track exact headcounts 
                  for catering and seating arrangements.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-lime-600 mb-4" />
                <CardTitle>Status Dashboard</CardTitle>
                <CardDescription>
                  Beautiful dashboard showing response statistics, guest lists, 
                  and everything you need for perfect planning.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-lime-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to streamline your next event?
          </h3>
          <p className="text-xl mb-8 text-lime-100">
            Join event organizers who've said goodbye to RSVP chaos
          </p>
          <Link href="/admin/event/new">
            <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h4 className="text-2xl font-bold mb-4">Count Me In</h4>
          <p className="text-slate-400 mb-6">
            Modern RSVP management for modern celebrations
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/admin/event/new" className="text-slate-400 hover:text-white transition-colors">
              Create Event
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
