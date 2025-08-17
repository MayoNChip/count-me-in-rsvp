'use client'

import { useState, useOptimistic, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Mail, 
  Edit, 
  Trash2,
  Users,
  Clock,
  Check,
  X,
  HelpCircle,
  MessageCircle
} from 'lucide-react'
import { GuestWithRsvp } from '@/lib/data/guests'
import { CreateGuestDialog } from './create-guest-dialog'
import { EditGuestDialog } from './edit-guest-dialog'
import { ImportGuestsDialog } from './import-guests-dialog'
import { WhatsAppSendButton } from './whatsapp-send-button'
import { WhatsAppBulkDialog } from './whatsapp-bulk-dialog'
import { deleteGuest } from '@/app/actions/guests'
import { exportGuestListToCSV } from '@/lib/utils/csv'
import { formatDate } from 'date-fns'
import { toast } from 'sonner'

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

interface GuestManagementProps {
  event: Event
  guests: GuestWithRsvp[]
}

type GuestAction = {
  type: 'delete'
  guestId: string
}

export function GuestManagement({ event, guests }: GuestManagementProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'yes' | 'no' | 'maybe' | 'pending'>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestWithRsvp | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isWhatsAppBulkDialogOpen, setIsWhatsAppBulkDialogOpen] = useState(false)

  // Use React's useOptimistic hook for optimistic updates
  const [optimisticGuests, deleteOptimistic] = useOptimistic(
    guests,
    (state: GuestWithRsvp[], action: GuestAction) => {
      switch (action.type) {
        case 'delete':
          return state.filter(guest => guest.id !== action.guestId)
        default:
          return state
      }
    }
  )

  // Filter guests based on search and status
  const filteredGuests = optimisticGuests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.phone?.includes(searchTerm)
    
    if (!matchesSearch) return false
    
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') return !guest.rsvp
    if (filterStatus === 'yes') return guest.rsvp?.status === 'yes'
    if (filterStatus === 'no') return guest.rsvp?.status === 'no'
    if (filterStatus === 'maybe') return guest.rsvp?.status === 'maybe'
    
    return true
  })

  // Delete guest handler with React's useOptimistic
  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    if (!confirm(`Are you sure you want to delete ${guestName}? This action cannot be undone.`)) {
      return
    }

    startTransition(() => {
      // Optimistically remove the guest from the UI
      deleteOptimistic({ type: 'delete', guestId })
    })
    
    try {
      const result = await deleteGuest({ id: guestId })
      
      if (result.success) {
        toast.success('Guest deleted successfully!')
        // Trigger a refresh to sync with the server state
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete guest')
        // React will automatically revert the optimistic update on error
        router.refresh()
      }
    } catch (error) {
      console.error('Delete guest error:', error)
      toast.error('An unexpected error occurred')
      // React will automatically revert the optimistic update on error
      router.refresh()
    }
  }

  // Export guests to CSV
  const handleExportGuests = () => {
    try {
      exportGuestListToCSV(optimisticGuests, event.name, filterStatus)
      toast.success('Guest list exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export guest list')
    }
  }

  // Calculate stats using optimistic guests
  const stats = {
    total: optimisticGuests.length,
    pending: optimisticGuests.filter(g => !g.rsvp).length,
    yes: optimisticGuests.filter(g => g.rsvp?.status === 'yes').length,
    no: optimisticGuests.filter(g => g.rsvp?.status === 'no').length,
    maybe: optimisticGuests.filter(g => g.rsvp?.status === 'maybe').length,
  }

  const getStatusBadge = (guest: GuestWithRsvp) => {
    if (!guest.rsvp) {
      return <Badge className="bg-slate-100 text-slate-600 border-0">Pending</Badge>
    }
    
    switch (guest.rsvp.status) {
      case 'yes':
        return <Badge className="bg-green-100 text-green-700 border-0">Attending</Badge>
      case 'no':
        return <Badge className="bg-red-100 text-red-700 border-0">Not Attending</Badge>
      case 'maybe':
        return <Badge className="bg-amber-100 text-amber-700 border-0">Maybe</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-0">Unknown</Badge>
    }
  }

  const getStatusIcon = (guest: GuestWithRsvp) => {
    if (!guest.rsvp) {
      return <Clock className="h-4 w-4 text-slate-400" />
    }
    
    switch (guest.rsvp.status) {
      case 'yes':
        return <Check className="h-4 w-4 text-green-600" />
      case 'no':
        return <X className="h-4 w-4 text-red-600" />
      case 'maybe':
        return <HelpCircle className="h-4 w-4 text-amber-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="space-y-8 slide-up">
      {/* Header */}
      <div className="modern-card p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Guest Management</h1>
            <p className="text-slate-600">
              Managing guests for <span className="font-semibold">{event.name}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl px-6 hover-lift"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Guest
            </Button>
            
            <Button 
              onClick={() => setIsImportDialogOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-xl px-6 hover-lift"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            
            <Button 
              onClick={handleExportGuests}
              className="bg-green-500 hover:bg-green-600 text-white border-0 rounded-xl px-6 hover-lift"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            
            <Button 
              onClick={() => setIsWhatsAppBulkDialogOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 rounded-xl px-6 hover-lift"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp Bulk
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="modern-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Guests</div>
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.yes}</div>
            <div className="text-sm text-slate-600">Attending</div>
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.no}</div>
            <div className="text-sm text-slate-600">Not Attending</div>
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.maybe}</div>
            <div className="text-sm text-slate-600">Maybe</div>
          </div>
        </div>
        
        <div className="modern-card p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">{stats.pending}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="modern-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search guests by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 clean-input"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {(['all', 'pending', 'yes', 'maybe', 'no'] as const).map((status) => (
              <Button
                key={status}
                onClick={() => setFilterStatus(status)}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                className={`rounded-xl ${
                  filterStatus === status 
                    ? 'bg-purple-500 text-white border-0' 
                    : 'btn-clean'
                }`}
              >
                {status === 'all' ? 'All' : 
                 status === 'pending' ? 'Pending' :
                 status === 'yes' ? 'Attending' :
                 status === 'no' ? 'Not Attending' :
                 'Maybe'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Guests List */}
      <div className="modern-card">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">
            Guests ({filteredGuests.length})
          </h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {filteredGuests.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No guests found</h3>
              <p className="text-slate-600 mb-6">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first guest to the event'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl px-6"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Guest
                </Button>
              )}
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <div key={guest.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(guest)}
                      <div>
                        <h3 className="font-semibold text-slate-800">{guest.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          {guest.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {guest.email}
                            </span>
                          )}
                          {guest.phone && <span>{guest.phone}</span>}
                          <span>Max guests: {guest.maxGuests}</span>
                          {guest.invitationStatus === 'sent' && (
                            <span className="flex items-center gap-1 text-green-600">
                              <MessageCircle className="h-3 w-3" />
                              Invited via {guest.invitationMethod || 'WhatsApp'}
                              {guest.invitationSentAt && (
                                <span className="text-slate-500">({formatDate(guest.invitationSentAt, 'MMM d')})</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getStatusBadge(guest)}
                    
                    {guest.rsvp && (
                      <div className="text-sm text-slate-600">
                        <div>Responded: {formatDate(guest.rsvp.respondedAt || new Date(), 'MMM d')}</div>
                        {guest.rsvp.numOfGuests > 0 && (
                          <div>Bringing: {guest.rsvp.numOfGuests} guest{guest.rsvp.numOfGuests > 1 ? 's' : ''}</div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <WhatsAppSendButton
                        guest={guest}
                        event={event}
                        variant="icon"
                        className="btn-clean"
                      />
                      
                      <Button
                        onClick={() => setEditingGuest(guest)}
                        size="sm"
                        className="btn-clean"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-red-600 hover:bg-red-50 border-0"
                        onClick={() => handleDeleteGuest(guest.id, guest.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {guest.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">{guest.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateGuestDialog
        eventId={event.id}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <ImportGuestsDialog
        eventId={event.id}
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
      
      {editingGuest && (
        <EditGuestDialog
          guest={editingGuest}
          open={!!editingGuest}
          onOpenChange={(open) => !open && setEditingGuest(null)}
        />
      )}
      
      <WhatsAppBulkDialog
        guests={optimisticGuests}
        event={event}
        open={isWhatsAppBulkDialogOpen}
        onOpenChange={setIsWhatsAppBulkDialogOpen}
      />
    </div>
  )
}