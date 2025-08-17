'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateEventSchema, type UpdateEventInput } from '@/lib/validations/events'
import { updateEvent } from '@/app/actions/events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar } from 'lucide-react'

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

interface EventEditFormProps {
  event: Event
  onSuccess?: (eventId: string) => void
}

export function EventEditForm({ event, onSuccess }: EventEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<UpdateEventInput>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: {
      id: event.id,
      name: event.name,
      date: event.date,
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      organizerEmail: event.organizerEmail,
    },
  })

  const onSubmit = async (data: UpdateEventInput) => {
    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      const result = await updateEvent(data)

      if (result.success && result.data) {
        setSuccess('Event updated successfully!')
        onSuccess?.(result.data.id)
      } else {
        setError(result.error || 'Failed to update event')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Event update error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl modern-card slide-up">
      <div className="p-8">
        <div className="text-center mb-8">
          <div className="mb-6 pulse-gentle">
            <div className="inline-block p-6 rounded-3xl bg-purple shadow-lg">
              <Calendar className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-3">Edit Your Event</h2>
          <p className="text-slate-600 text-lg">Update your event details</p>
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter event name"
              disabled={isSubmitting}
              className="clean-input"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
                disabled={isSubmitting}
                className="clean-input"
              />
              {form.formState.errors.date && (
                <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                {...form.register('time')}
                disabled={isSubmitting}
                className="clean-input"
              />
              {form.formState.errors.time && (
                <p className="text-sm text-red-600">{form.formState.errors.time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...form.register('location')}
              placeholder="Enter event location"
              disabled={isSubmitting}
              className="clean-input"
            />
            {form.formState.errors.location && (
              <p className="text-sm text-red-600">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Enter event description"
              disabled={isSubmitting}
              rows={3}
              className="clean-input"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizerEmail">Organizer Email *</Label>
            <Input
              id="organizerEmail"
              type="email"
              {...form.register('organizerEmail')}
              placeholder="Enter organizer email"
              disabled={isSubmitting}
              className="clean-input"
            />
            {form.formState.errors.organizerEmail && (
              <p className="text-sm text-red-600">{form.formState.errors.organizerEmail.message}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-lime-500 hover:bg-lime-600 text-white shadow-lg hover-lift border-0 rounded-xl"
              size="lg"
            >
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isSubmitting ? 'Updating...' : 'Update Event'}
            </Button>
            
            <Button
              type="button"
              onClick={() => form.reset()}
              disabled={isSubmitting}
              className="btn-clean px-6"
              size="lg"
            >
              Reset
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}