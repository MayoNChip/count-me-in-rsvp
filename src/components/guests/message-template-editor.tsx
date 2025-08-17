'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Copy, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle,
  Info
} from 'lucide-react'
import { createWhatsAppMessage } from '@/lib/utils/whatsapp'
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

interface MessageTemplateEditorProps {
  event: Event
  sampleGuest: Guest
  initialTemplate?: string
  onChange: (template: string) => void
  requireGuestName?: boolean
  maxLength?: number
  className?: string
}

// Default template presets
const DEFAULT_TEMPLATES = {
  wedding: `Hi {guestName}! 💕

We're getting married and would love for you to join us!

📅 {eventName}
📍 {eventLocation}
🕐 {eventDate} at {eventTime}

Please RSVP: {rsvpUrl}

Can't wait to celebrate with you! 🎉`,

  birthday: `Hi {guestName}! 🎂

You're invited to celebrate my birthday!

🎉 {eventName}
📍 {eventLocation}
📅 {eventDate} at {eventTime}

RSVP here: {rsvpUrl}

Hope to see you there! 🥳`,

  business: `Hello {guestName},

You're invited to {eventName}.

📅 Date: {eventDate}
⏰ Time: {eventTime}
📍 Location: {eventLocation}

Please confirm your attendance: {rsvpUrl}

Looking forward to seeing you there.

Best regards`,

  casual: `Hey {guestName}! 👋

Want to join us for {eventName}?

When: {eventDate} at {eventTime}
Where: {eventLocation}

Let me know: {rsvpUrl}

Hope you can make it! 😊`
}

const PLACEHOLDERS = [
  { key: '{guestName}', label: 'Guest Name', description: "Recipient's name" },
  { key: '{eventName}', label: 'Event Name', description: 'Name of the event' },
  { key: '{eventDate}', label: 'Event Date', description: 'Formatted event date' },
  { key: '{eventTime}', label: 'Event Time', description: 'Formatted event time' },
  { key: '{eventLocation}', label: 'Event Location', description: 'Event venue' },
  { key: '{rsvpUrl}', label: 'RSVP URL', description: 'Link to RSVP page' }
]

export function MessageTemplateEditor({
  event,
  sampleGuest,
  initialTemplate = DEFAULT_TEMPLATES.wedding,
  onChange,
  requireGuestName = false,
  maxLength = 1600, // WhatsApp message limit
  className
}: MessageTemplateEditorProps) {
  const [template, setTemplate] = useState(initialTemplate)

  // Update local state when initialTemplate changes
  useEffect(() => {
    setTemplate(initialTemplate)
  }, [initialTemplate])

  // Generate live preview
  const preview = useMemo(() => {
    if (!template.trim()) return ''
    
    try {
      const rsvpUrl = `${window.location.origin}/rsvp/${sampleGuest.token}`
      const guestForMessage = { ...sampleGuest, phone: sampleGuest.phone || '+1-555-000-0000' }
      return createWhatsAppMessage(guestForMessage, event, rsvpUrl, template)
    } catch (error) {
      console.error('Error generating preview:', error)
      return 'Error generating preview'
    }
  }, [template, sampleGuest, event])

  // Validation
  const characterCount = template.length
  const isTooLong = characterCount > maxLength
  const missingGuestName = requireGuestName && !template.includes('{guestName}')

  const handleTemplateChange = (newTemplate: string) => {
    setTemplate(newTemplate)
    onChange(newTemplate)
  }

  const insertPlaceholder = (placeholder: string) => {
    const newTemplate = template + placeholder
    handleTemplateChange(newTemplate)
  }

  const applyDefaultTemplate = (templateKey: keyof typeof DEFAULT_TEMPLATES) => {
    const newTemplate = DEFAULT_TEMPLATES[templateKey]
    handleTemplateChange(newTemplate)
  }

  const resetTemplate = () => {
    handleTemplateChange(initialTemplate)
  }

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(template)
    } catch (error) {
      console.error('Failed to copy template:', error)
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Message Template</h3>
          <p className="text-sm text-slate-600">
            Customize your WhatsApp invitation message with placeholders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyTemplate}
            disabled={!template.trim()}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetTemplate}
            disabled={template === initialTemplate}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Editor */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Template Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Input */}
            <div>
              <Label htmlFor="template-content" className="sr-only">
                Template content
              </Label>
              <Textarea
                id="template-content"
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                placeholder="Enter your message template..."
                rows={12}
                className={cn(
                  'font-mono text-sm resize-none',
                  isTooLong && 'border-red-500 focus:border-red-500'
                )}
                aria-label="Template content"
              />
            </div>

            {/* Character count and validation */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className={cn(
                  'text-slate-600',
                  isTooLong && 'text-red-600 font-medium'
                )}>
                  {characterCount} characters
                  {maxLength && ` / ${maxLength}`}
                </span>
                {isTooLong && (
                  <Badge variant="destructive" className="text-xs">
                    Too long
                  </Badge>
                )}
              </div>
            </div>

            {/* Validation alerts */}
            {(isTooLong || missingGuestName) && (
              <div className="space-y-2">
                {isTooLong && (
                  <Alert className="border-red-500">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      Message is too long. WhatsApp messages should be under {maxLength} characters.
                    </AlertDescription>
                  </Alert>
                )}
                {missingGuestName && (
                  <Alert className="border-amber-500">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-600">
                      Template must include {'{guestName}'} placeholder for personalization.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Placeholder buttons */}
            <div>
              <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Insert Placeholders
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {PLACEHOLDERS.map((placeholder) => (
                  <Button
                    key={placeholder.key}
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder(placeholder.key)}
                    className="justify-start text-left h-auto py-2"
                    title={placeholder.description}
                  >
                    <span className="font-mono text-xs text-purple-600">
                      {placeholder.key}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Default templates */}
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Default Templates</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(DEFAULT_TEMPLATES).map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyDefaultTemplate(key as keyof typeof DEFAULT_TEMPLATES)}
                    className="capitalize"
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Preview info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Preview using <strong>{sampleGuest.name}</strong> as sample guest
                </AlertDescription>
              </Alert>

              {/* Preview content */}
              <div 
                className="bg-green-50 border border-green-200 rounded-lg p-4 min-h-[300px]"
                aria-label="Message preview"
              >
                {preview ? (
                  <div className="space-y-2">
                    <div className="text-xs text-green-700 font-medium mb-2 flex items-center gap-1">
                      WhatsApp Message Preview
                    </div>
                    <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {preview}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No preview available</p>
                    <p className="text-xs">Enter a template to see preview</p>
                  </div>
                )}
              </div>

              {/* Preview stats */}
              {preview && (
                <div className="text-xs text-slate-600 bg-slate-50 rounded p-2">
                  <div>Preview length: {preview.length} characters</div>
                  <div>Using: {sampleGuest.name} • {event.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}