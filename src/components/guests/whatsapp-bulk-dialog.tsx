'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, Loader2, CheckCircle, Users, AlertCircle } from 'lucide-react'
import { validatePhoneNumber, formatPhoneForWhatsApp, createWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp'
import { markBulkWhatsAppInvitationsSent } from '@/app/actions/whatsapp-invitation'
import { MessageTemplateEditor } from './message-template-editor'
import { cn } from '@/lib/utils'

interface Guest {
  id: string
  name: string
  phone: string | null
  email: string | null
  eventId: string
  token: string
  invitationStatus: string
  rsvpStatus: string | null
  guestCount: number | null
  createdAt: Date
  updatedAt: Date
}

interface Event {
  id: string
  name: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  organizerEmail?: string
  createdAt?: Date
  updatedAt?: Date
}

interface WhatsAppBulkDialogProps {
  guests: Guest[]
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: (guestIds: string[]) => void
}

const DEFAULT_TEMPLATE = `Hi {guestName}! 🎉

You're invited to {eventName} on {eventDate}!

Please RSVP using this link: {rsvpUrl}

Looking forward to celebrating with you! 💫`

type SendingState = 'idle' | 'sending' | 'complete' | 'error'

export function WhatsAppBulkDialog({
  guests,
  event,
  open,
  onOpenChange,
  onSent
}: WhatsAppBulkDialogProps) {
  // Filter guests with valid phone numbers
  const guestsWithPhones = useMemo(() => 
    guests.filter(guest => guest.phone && validatePhoneNumber(guest.phone)),
    [guests]
  )

  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(
    new Set(guestsWithPhones.map(g => g.id))
  )
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE)
  const [sendingState, setSendingState] = useState<SendingState>('idle')
  const [currentSendingIndex, setCurrentSendingIndex] = useState(0)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedGuestIds(new Set(guestsWithPhones.map(g => g.id)))
      setMessageTemplate(DEFAULT_TEMPLATE)
      setSendingState('idle')
      setCurrentSendingIndex(0)
    }
  }, [open, guestsWithPhones])

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuestIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(guestId)) {
        newSet.delete(guestId)
      } else {
        newSet.add(guestId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedGuestIds(new Set(guestsWithPhones.map(g => g.id)))
  }

  const selectNone = () => {
    setSelectedGuestIds(new Set())
  }


  const handleSend = async () => {
    const selectedGuests = guestsWithPhones.filter(g => selectedGuestIds.has(g.id))
    
    if (selectedGuests.length === 0) return

    setSendingState('sending')
    setCurrentSendingIndex(0)

    try {
      for (let i = 0; i < selectedGuests.length; i++) {
        const guest = selectedGuests[i]
        setCurrentSendingIndex(i + 1)

        if (!guest.phone) continue

        const formattedPhone = formatPhoneForWhatsApp(guest.phone)
        const rsvpUrl = `${window.location.origin}/rsvp/${guest.token}`
        const guestForMessage = { ...guest, phone: guest.phone }
        const message = createWhatsAppMessage(guestForMessage, event, rsvpUrl, messageTemplate)
        const whatsappUrl = generateWhatsAppUrl(formattedPhone, message)

        if (!whatsappUrl) {
          console.error(`Failed to generate WhatsApp URL for guest: ${guest.id}`)
          continue
        }

        // Open WhatsApp
        window.open(whatsappUrl, '_blank')

        // Add delay between opening tabs to prevent browser blocking
        if (i < selectedGuests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }

      // Update invitation status in database
      try {
        const sentGuestIds = Array.from(selectedGuestIds)
        const result = await markBulkWhatsAppInvitationsSent(sentGuestIds)
        if (!result.success) {
          console.error('Failed to update bulk invitation status:', result.error)
        }
      } catch (error) {
        console.error('Error updating bulk invitation status:', error)
      }

      setSendingState('complete')
      onSent?.(Array.from(selectedGuestIds))
      
      // Close dialog after showing success message
      setTimeout(() => {
        onOpenChange(false)
      }, 2000)
      
    } catch (error) {
      console.error('Error sending WhatsApp invitations:', error)
      setSendingState('error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Invitations</DialogTitle>
          <DialogDescription>
            Select guests to send WhatsApp invitations. Each invitation will open in a new tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Guest Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base">Select Guests</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={sendingState === 'sending'}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectNone}
                  disabled={sendingState === 'sending'}
                >
                  Select None
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
              {guestsWithPhones.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No guests with valid phone numbers</p>
                </div>
              ) : (
                guestsWithPhones.map((guest) => (
                  <div key={guest.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`guest-${guest.id}`}
                      checked={selectedGuestIds.has(guest.id)}
                      onCheckedChange={() => toggleGuestSelection(guest.id)}
                      disabled={sendingState === 'sending'}
                      aria-label={guest.name}
                    />
                    <Label
                      htmlFor={`guest-${guest.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-medium">{guest.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {guest.phone}
                      </span>
                    </Label>
                  </div>
                ))
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-2">
              {selectedGuestIds.size} {selectedGuestIds.size === 1 ? 'guest' : 'guests'} selected
            </p>
          </div>

          {/* Message Template Editor */}
          <MessageTemplateEditor
            event={event}
            sampleGuest={guestsWithPhones[0] || {
              id: 'sample',
              name: 'Sample Guest',
              phone: '+1-555-000-0000',
              email: 'sample@example.com',
              eventId: event.id,
              token: 'sample-token',
              invitationStatus: 'pending',
              rsvpStatus: null,
              guestCount: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }}
            initialTemplate={messageTemplate}
            onChange={(newTemplate) => setMessageTemplate(newTemplate)}
          />

          {/* Status Messages */}
          {sendingState === 'sending' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Sending invitation {currentSendingIndex} of {selectedGuestIds.size}...
              </AlertDescription>
            </Alert>
          )}

          {sendingState === 'complete' && (
            <Alert className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Invitations sent successfully!
              </AlertDescription>
            </Alert>
          )}

          {sendingState === 'error' && (
            <Alert className="border-red-500">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">
                Some invitations failed to send. Please check the console for details.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendingState === 'sending'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={selectedGuestIds.size === 0 || sendingState === 'sending'}
            className={cn(
              sendingState === 'complete' && 'bg-green-500 hover:bg-green-600'
            )}
          >
            {sendingState === 'sending' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : sendingState === 'complete' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Sent!
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}