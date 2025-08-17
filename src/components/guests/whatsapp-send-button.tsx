'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MessageCircle, Loader2, Check } from 'lucide-react'
import { validatePhoneNumber, formatPhoneForWhatsApp, createWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp'
import { markWhatsAppInvitationSent } from '@/app/actions/whatsapp-invitation'
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
  userId?: string
  createdAt?: Date
  updatedAt?: Date
}

interface WhatsAppSendButtonProps {
  guest: Guest
  event: Event
  messageTemplate?: string
  variant?: 'default' | 'icon'
  className?: string
  onSent?: () => void
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

export function WhatsAppSendButton({
  guest,
  event,
  messageTemplate,
  variant = 'default',
  className,
  onSent
}: WhatsAppSendButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')

  const hasValidPhone = guest.phone && validatePhoneNumber(guest.phone)
  const isDisabled = !hasValidPhone || state === 'loading'

  const getButtonContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {variant === 'default' && <span className="ml-2">Sending...</span>}
          </>
        )
      case 'success':
        return (
          <>
            <Check className="h-4 w-4" />
            {variant === 'default' && <span className="ml-2">Sent!</span>}
          </>
        )
      default:
        return (
          <>
            <MessageCircle className="h-4 w-4" />
            {variant === 'default' && <span className="ml-2">WhatsApp</span>}
          </>
        )
    }
  }

  const getTooltipContent = () => {
    if (!guest.phone) {
      return 'No phone number available'
    }
    if (!hasValidPhone) {
      return 'Invalid phone number format'
    }
    if (state === 'success') {
      return 'WhatsApp invitation sent!'
    }
    return `Send WhatsApp invitation to ${guest.name}`
  }

  const getAriaLabel = () => {
    if (!hasValidPhone) {
      return 'Cannot send WhatsApp invitation - no phone number'
    }
    return `Send WhatsApp invitation to ${guest.name}`
  }

  const handleClick = async () => {
    if (!hasValidPhone) return

    setState('loading')

    try {
      // Format phone number
      const formattedPhone = formatPhoneForWhatsApp(guest.phone!)
      
      // Generate RSVP URL
      const rsvpUrl = `${window.location.origin}/rsvp/${guest.token}`
      
      // Create message (we already validated guest.phone is not null)
      const guestForMessage = { ...guest, phone: guest.phone! }
      const message = createWhatsAppMessage(guestForMessage, event, rsvpUrl, messageTemplate)
      
      // Generate WhatsApp URL
      const whatsappUrl = generateWhatsAppUrl(formattedPhone, message)
      
      if (!whatsappUrl) {
        console.error('Failed to generate WhatsApp URL for guest:', guest.id)
        setState('error')
        setTimeout(() => setState('idle'), 2000)
        return
      }
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank')
      
      // Mark invitation as sent in database
      try {
        const result = await markWhatsAppInvitationSent(guest.id)
        if (!result.success) {
          console.error('Failed to update invitation status:', result.error)
        }
      } catch (error) {
        console.error('Error updating invitation status:', error)
      }
      
      setState('success')
      onSent?.()
      
      // Reset state after 2 seconds
      setTimeout(() => setState('idle'), 2000)
      
    } catch (error) {
      console.error('Error sending WhatsApp invitation:', error)
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  const button = (
    <Button
      variant={variant === 'icon' ? 'ghost' : 'outline'}
      size={variant === 'icon' ? 'icon' : 'sm'}
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={getAriaLabel()}
      className={cn(
        'transition-colors',
        state === 'success' && 'border-green-500 text-green-600',
        state === 'error' && 'border-red-500 text-red-600',
        className
      )}
    >
      {getButtonContent()}
    </Button>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}