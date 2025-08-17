'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bulkSendInvitations } from '@/app/actions/invitations'
import { Mail, MessageSquare, Users, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { GuestWithRsvp } from '@/lib/data/guests'

interface SendInvitationsDialogProps {
  eventId: string
  selectedGuests: GuestWithRsvp[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendInvitationsDialog({ 
  eventId, 
  selectedGuests, 
  open, 
  onOpenChange 
}: SendInvitationsDialogProps) {
  const router = useRouter()
  const [method, setMethod] = useState<'email' | 'whatsapp' | 'manual'>('email')
  const [customMessage, setCustomMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Filter guests that can receive the selected method
  const eligibleGuests = selectedGuests.filter(guest => {
    if (method === 'email') return guest.email
    if (method === 'whatsapp') return guest.phone
    if (method === 'manual') return true
    return false
  })

  const handleSendInvitations = async () => {
    if (eligibleGuests.length === 0) {
      toast.error(`No guests have ${method === 'email' ? 'email addresses' : method === 'whatsapp' ? 'phone numbers' : 'valid contact info'}`)
      return
    }

    setIsLoading(true)

    try {
      const result = await bulkSendInvitations({
        eventId,
        guestIds: eligibleGuests.map(g => g.id),
        method,
        customMessage: customMessage || undefined,
      })

      if (result.success) {
        const { sent, failed } = result.data || { sent: 0, failed: 0 }
        
        if (failed > 0) {
          toast.warning(`Sent ${sent} invitations, ${failed} failed`)
        } else {
          toast.success(`Successfully sent ${sent} invitation${sent !== 1 ? 's' : ''}!`)
        }
        
        onOpenChange(false)
        router.refresh()
        resetDialog()
      } else {
        toast.error(result.error || 'Failed to send invitations')
      }
    } catch (error) {
      console.error('Send invitations error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetDialog = () => {
    setMethod('email')
    setCustomMessage('')
    setIsLoading(false)
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
      resetDialog()
    }
  }

  const emailCount = selectedGuests.filter(g => g.email).length
  const whatsappCount = selectedGuests.filter(g => g.phone).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] modern-card border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Send Invitations</DialogTitle>
          <DialogDescription className="text-slate-600">
            Send invitations to {selectedGuests.length} selected guest{selectedGuests.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-blue-600">
                {emailCount} with email • {whatsappCount} with phone
              </p>
            </div>
          </div>

          <div>
            <Label className="text-slate-700 font-medium mb-3 block">
              Invitation Method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => setMethod('email')}
                className={`p-4 h-auto flex-col gap-2 ${
                  method === 'email'
                    ? 'bg-blue-500 text-white border-0'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-0'
                }`}
              >
                <Mail className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">Email</div>
                  <div className="text-xs opacity-80">{emailCount} recipients</div>
                </div>
              </Button>

              <Button
                type="button"
                onClick={() => setMethod('whatsapp')}
                className={`p-4 h-auto flex-col gap-2 ${
                  method === 'whatsapp'
                    ? 'bg-green-500 text-white border-0'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-0'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">WhatsApp</div>
                  <div className="text-xs opacity-80">{whatsappCount} recipients</div>
                </div>
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-slate-700 font-medium">
              Custom Message (Optional)
            </Label>
            <Textarea
              placeholder="Add a personal message to include with the invitation..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="clean-input min-h-[80px] resize-none mt-2"
            />
            <p className="text-xs text-slate-500 mt-2">
              This message will be included along with the RSVP link.
            </p>
          </div>

          {eligibleGuests.length < selectedGuests.length && (
            <div className="p-3 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-2 text-amber-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium">
                  {selectedGuests.length - eligibleGuests.length} guest{selectedGuests.length - eligibleGuests.length !== 1 ? 's' : ''} 
                  {' '}will be skipped (no {method === 'email' ? 'email address' : 'phone number'})
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            onClick={handleClose}
            disabled={isLoading}
            className="btn-clean"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitations}
            disabled={isLoading || eligibleGuests.length === 0}
            className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {eligibleGuests.length} Invitation{eligibleGuests.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}