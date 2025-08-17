'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  Check, 
  X, 
  AlertTriangle,
  Send,
  Phone
} from 'lucide-react'
import { formatDate } from 'date-fns'

interface InvitationStatusProps {
  invitationStatus: string
  invitationSentAt: Date | null
  invitationMethod: string | null
  guestEmail: string | null
  guestPhone: string | null
  onSendInvitation?: (method: 'email' | 'sms') => void
  isLoading?: boolean
}

export function InvitationStatus({ 
  invitationStatus, 
  invitationSentAt, 
  invitationMethod,
  guestEmail,
  guestPhone,
  onSendInvitation,
  isLoading = false
}: InvitationStatusProps) {
  
  const getStatusBadge = () => {
    switch (invitationStatus) {
      case 'sent':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-0">
            <Check className="h-3 w-3 mr-1" />
            Invited
          </Badge>
        )
      case 'delivered':
        return (
          <Badge className="bg-green-100 text-green-700 border-0">
            <Check className="h-3 w-3 mr-1" />
            Delivered
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 border-0">
            <X className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case 'bounced':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-0">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Bounced
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Not Sent
          </Badge>
        )
    }
  }

  const getMethodIcon = () => {
    switch (invitationMethod) {
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'sms':
        return <MessageSquare className="h-3 w-3" />
      default:
        return null
    }
  }

  const canSendEmail = guestEmail && !isLoading
  const canSendSMS = guestPhone && !isLoading
  const hasBeenSent = invitationStatus !== 'not_sent'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        
        {hasBeenSent && invitationSentAt && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {getMethodIcon()}
            <span>{formatDate(invitationSentAt, 'MMM d')}</span>
          </div>
        )}
      </div>

      {!hasBeenSent && onSendInvitation && (
        <div className="flex gap-1">
          {canSendEmail && (
            <Button
              size="sm"
              onClick={() => onSendInvitation('email')}
              disabled={isLoading}
              className="h-6 px-2 text-xs bg-blue-500 hover:bg-blue-600 text-white border-0 rounded"
            >
              <Mail className="h-3 w-3 mr-1" />
              Email
            </Button>
          )}
          
          {canSendSMS && (
            <Button
              size="sm"
              onClick={() => onSendInvitation('sms')}
              disabled={isLoading}
              className="h-6 px-2 text-xs bg-green-500 hover:bg-green-600 text-white border-0 rounded"
            >
              <Phone className="h-3 w-3 mr-1" />
              SMS
            </Button>
          )}
        </div>
      )}

      {hasBeenSent && onSendInvitation && (
        <div className="flex gap-1">
          {canSendEmail && (
            <Button
              size="sm"
              onClick={() => onSendInvitation('email')}
              disabled={isLoading}
              className="h-6 px-2 text-xs bg-slate-500 hover:bg-slate-600 text-white border-0 rounded"
            >
              <Send className="h-3 w-3 mr-1" />
              Resend
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function getInvitationStatusColor(status: string): string {
  switch (status) {
    case 'sent':
      return 'text-blue-600'
    case 'delivered':
      return 'text-green-600'
    case 'failed':
      return 'text-red-600'
    case 'bounced':
      return 'text-orange-600'
    default:
      return 'text-slate-500'
  }
}

export function getInvitationStatusIcon(status: string) {
  switch (status) {
    case 'sent':
    case 'delivered':
      return <Check className="h-4 w-4" />
    case 'failed':
      return <X className="h-4 w-4" />
    case 'bounced':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}