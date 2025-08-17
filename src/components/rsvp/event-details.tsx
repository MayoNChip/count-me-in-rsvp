'use client'

import React from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface EventDetailsProps {
  event: Event
  className?: string
}

export function EventDetails({ event, className }: EventDetailsProps) {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString // Return original string if invalid
      }
      
      const day = date.getDate()
      const month = date.toLocaleDateString('en-US', { month: 'long' })
      const year = date.getFullYear()
      
      // Add ordinal suffix
      const getOrdinalSuffix = (day: number): string => {
        if (day > 3 && day < 21) return 'th'
        switch (day % 10) {
          case 1: return 'st'
          case 2: return 'nd'
          case 3: return 'rd'
          default: return 'th'
        }
      }
      
      return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string): string => {
    try {
      // Handle HH:MM:SS format
      const [hours, minutes] = timeString.split(':').map(Number)
      
      if (isNaN(hours) || isNaN(minutes)) {
        return timeString // Return original string if invalid
      }

      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  const formatDescription = (description: string): React.ReactNode => {
    return description.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <><br /><br /></>}
      </React.Fragment>
    ))
  }

  const hasValidTime = event.time && event.time.trim() !== ''
  const hasValidLocation = event.location && event.location.trim() !== ''
  const hasValidDescription = event.description && event.description.trim() !== ''

  return (
    <article className={cn('bg-white rounded-lg shadow-sm border p-6 space-y-6', className)}>
      {/* Event Title */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          {event.name}
        </h1>
      </div>

      {/* Event Information */}
      <div className="space-y-4">
        {/* Date - Always shown */}
        <div className="flex items-start gap-3">
          <Calendar 
            className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" 
            data-testid="calendar-icon"
            aria-label="Date"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">
              <time dateTime={event.date}>
                {formatDate(event.date)}
              </time>
            </div>
          </div>
        </div>

        {/* Time - Only shown if present */}
        {hasValidTime && (
          <div className="flex items-start gap-3">
            <Clock 
              className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" 
              data-testid="clock-icon"
              aria-label="Time"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                <time dateTime={event.time!}>
                  {formatTime(event.time!)}
                </time>
              </div>
            </div>
          </div>
        )}

        {/* Location - Only shown if present */}
        {hasValidLocation && (
          <div className="flex items-start gap-3">
            <MapPin 
              className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" 
              data-testid="map-pin-icon"
              aria-label="Location"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 break-words">
                {event.location}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description - Only shown if present */}
      {hasValidDescription && (
        <div className="border-t pt-6">
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {formatDescription(event.description!)}
            </p>
          </div>
        </div>
      )}
    </article>
  )
}