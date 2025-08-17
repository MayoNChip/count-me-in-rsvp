/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { EventDetails } from '@/components/rsvp/event-details'

describe('EventDetails', () => {
  const baseEvent = {
    id: 'event1',
    name: 'Wedding Celebration',
    date: '2025-12-31',
    time: '18:00:00',
    location: 'Grand Ballroom, Downtown Hotel',
    description: 'Join us for our special day as we celebrate our union with family and friends.',
    organizerEmail: 'organizer@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  describe('Component Render', () => {
    it('should render event details with all information', () => {
      render(<EventDetails event={baseEvent} />)

      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      expect(screen.getByText('December 31st, 2025')).toBeInTheDocument()
      expect(screen.getByText('6:00 PM')).toBeInTheDocument()
      expect(screen.getByText('Grand Ballroom, Downtown Hotel')).toBeInTheDocument()
      expect(screen.getByText(/Join us for our special day/)).toBeInTheDocument()
    })

    it('should display proper semantic structure', () => {
      render(<EventDetails event={baseEvent} />)

      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      
      // Should have proper sectioning
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should show event icons with information', () => {
      render(<EventDetails event={baseEvent} />)

      // Calendar icon should be present for date
      const calendarIcon = document.querySelector('svg[data-testid="calendar-icon"]')
      expect(calendarIcon).toBeInTheDocument()

      // Clock icon should be present for time
      const clockIcon = document.querySelector('svg[data-testid="clock-icon"]')
      expect(clockIcon).toBeInTheDocument()

      // Map pin icon should be present for location
      const mapIcon = document.querySelector('svg[data-testid="map-pin-icon"]')
      expect(mapIcon).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      render(<EventDetails event={baseEvent} />)
      expect(screen.getByText('December 31st, 2025')).toBeInTheDocument()
    })

    it('should handle different date formats', () => {
      const eventWithDifferentDate = {
        ...baseEvent,
        date: '2025-06-15'
      }

      render(<EventDetails event={eventWithDifferentDate} />)
      expect(screen.getByText('June 15th, 2025')).toBeInTheDocument()
    })

    it('should handle leap year dates', () => {
      const leapYearEvent = {
        ...baseEvent,
        date: '2024-02-29'
      }

      render(<EventDetails event={leapYearEvent} />)
      expect(screen.getByText('February 29th, 2024')).toBeInTheDocument()
    })

    it('should handle first and last days of year', () => {
      const newYearEvent = {
        ...baseEvent,
        date: '2025-01-01'
      }

      render(<EventDetails event={newYearEvent} />)
      expect(screen.getByText('January 1st, 2025')).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('should format 24-hour time to 12-hour format', () => {
      render(<EventDetails event={baseEvent} />)
      expect(screen.getByText('6:00 PM')).toBeInTheDocument()
    })

    it('should handle morning times', () => {
      const morningEvent = {
        ...baseEvent,
        time: '09:30:00'
      }

      render(<EventDetails event={morningEvent} />)
      expect(screen.getByText('9:30 AM')).toBeInTheDocument()
    })

    it('should handle noon and midnight', () => {
      const noonEvent = {
        ...baseEvent,
        time: '12:00:00'
      }

      const { rerender } = render(<EventDetails event={noonEvent} />)
      expect(screen.getByText('12:00 PM')).toBeInTheDocument()

      const midnightEvent = {
        ...baseEvent,
        time: '00:00:00'
      }

      rerender(<EventDetails event={midnightEvent} />)
      expect(screen.getByText('12:00 AM')).toBeInTheDocument()
    })

    it('should handle minutes correctly', () => {
      const eventWithMinutes = {
        ...baseEvent,
        time: '14:45:00'
      }

      render(<EventDetails event={eventWithMinutes} />)
      expect(screen.getByText('2:45 PM')).toBeInTheDocument()
    })

    it('should handle single digit hours', () => {
      const singleDigitHourEvent = {
        ...baseEvent,
        time: '07:15:00'
      }

      render(<EventDetails event={singleDigitHourEvent} />)
      expect(screen.getByText('7:15 AM')).toBeInTheDocument()
    })
  })

  describe('Optional Fields', () => {
    it('should handle missing time gracefully', () => {
      const eventWithoutTime = {
        ...baseEvent,
        time: null
      }

      render(<EventDetails event={eventWithoutTime} />)
      
      expect(screen.getByText('December 31st, 2025')).toBeInTheDocument()
      expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument()
      
      // Time section should not be displayed
      const clockIcon = document.querySelector('svg[data-testid="clock-icon"]')
      expect(clockIcon).not.toBeInTheDocument()
    })

    it('should handle missing location gracefully', () => {
      const eventWithoutLocation = {
        ...baseEvent,
        location: null
      }

      render(<EventDetails event={eventWithoutLocation} />)
      
      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      expect(screen.queryByText('Grand Ballroom')).not.toBeInTheDocument()
      
      // Location section should not be displayed
      const mapIcon = document.querySelector('svg[data-testid="map-pin-icon"]')
      expect(mapIcon).not.toBeInTheDocument()
    })

    it('should handle missing description gracefully', () => {
      const eventWithoutDescription = {
        ...baseEvent,
        description: null
      }

      render(<EventDetails event={eventWithoutDescription} />)
      
      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      expect(screen.queryByText(/Join us for our special day/)).not.toBeInTheDocument()
    })

    it('should handle empty string fields', () => {
      const eventWithEmptyFields = {
        ...baseEvent,
        time: '',
        location: '',
        description: ''
      }

      render(<EventDetails event={eventWithEmptyFields} />)
      
      // Should still show event name and date
      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      expect(screen.getByText('December 31st, 2025')).toBeInTheDocument()
      
      // Empty fields should not be displayed
      expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument()
      const clockIcon = document.querySelector('svg[data-testid="clock-icon"]')
      expect(clockIcon).not.toBeInTheDocument()
    })

    it('should handle all optional fields missing', () => {
      const minimalEvent = {
        ...baseEvent,
        time: null,
        location: null,
        description: null
      }

      render(<EventDetails event={minimalEvent} />)
      
      // Should show required fields
      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      expect(screen.getByText('December 31st, 2025')).toBeInTheDocument()
      
      // Should not show optional field icons
      expect(document.querySelector('svg[data-testid="clock-icon"]')).not.toBeInTheDocument()
      expect(document.querySelector('svg[data-testid="map-pin-icon"]')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive classes for mobile layout', () => {
      render(<EventDetails event={baseEvent} />)
      
      const container = screen.getByRole('article')
      expect(container).toHaveClass('space-y-6')
    })

    it('should stack elements vertically on small screens', () => {
      render(<EventDetails event={baseEvent} />)
      
      // Check that the layout classes are applied
      const eventInfo = document.querySelector('.space-y-4')
      expect(eventInfo).toBeInTheDocument()
    })

    it('should have appropriate text sizing for different screens', () => {
      render(<EventDetails event={baseEvent} />)
      
      const heading = screen.getByRole('heading', { name: 'Wedding Celebration' })
      expect(heading).toHaveClass('text-3xl', 'sm:text-4xl')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<EventDetails event={baseEvent} />)
      
      // Should have proper heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      
      // Should have article role for semantic structure
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('should have proper semantic markup for event information', () => {
      render(<EventDetails event={baseEvent} />)
      
      // Date and time should be in time elements with datetime attributes
      const dateElement = document.querySelector('time[datetime="2025-12-31"]')
      expect(dateElement).toBeInTheDocument()
      
      const timeElement = document.querySelector('time[datetime="18:00:00"]')
      expect(timeElement).toBeInTheDocument()
    })

    it('should provide proper alt text for icons', () => {
      render(<EventDetails event={baseEvent} />)
      
      // Icons should have proper ARIA labels
      const calendarIcon = document.querySelector('svg[aria-label="Date"]')
      expect(calendarIcon).toBeInTheDocument()
      
      const clockIcon = document.querySelector('svg[aria-label="Time"]')
      expect(clockIcon).toBeInTheDocument()
      
      const mapIcon = document.querySelector('svg[aria-label="Location"]')
      expect(mapIcon).toBeInTheDocument()
    })
  })

  describe('Content Formatting', () => {
    it('should preserve line breaks in description', () => {
      const eventWithMultilineDescription = {
        ...baseEvent,
        description: 'First line of description.\n\nSecond paragraph with more details.'
      }

      render(<EventDetails event={eventWithMultilineDescription} />)
      
      // Should handle multiline descriptions properly
      expect(screen.getByText(/First line of description/)).toBeInTheDocument()
      expect(screen.getByText(/Second paragraph/)).toBeInTheDocument()
    })

    it('should handle long event names gracefully', () => {
      const eventWithLongName = {
        ...baseEvent,
        name: 'A Very Long Event Name That Might Wrap to Multiple Lines in the Display'
      }

      render(<EventDetails event={eventWithLongName} />)
      
      expect(screen.getByRole('heading', { name: /A Very Long Event Name/ })).toBeInTheDocument()
    })

    it('should handle long locations gracefully', () => {
      const eventWithLongLocation = {
        ...baseEvent,
        location: 'A Very Long Location Name with Multiple Parts, Street Address, City, State, Country, Postal Code'
      }

      render(<EventDetails event={eventWithLongLocation} />)
      
      expect(screen.getByText(/A Very Long Location Name/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid date formats gracefully', () => {
      const eventWithInvalidDate = {
        ...baseEvent,
        date: 'invalid-date'
      }

      render(<EventDetails event={eventWithInvalidDate} />)
      
      // Should still render the component without crashing
      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      
      // Should show fallback date display
      expect(screen.getByText('invalid-date')).toBeInTheDocument()
    })

    it('should handle invalid time formats gracefully', () => {
      const eventWithInvalidTime = {
        ...baseEvent,
        time: 'invalid-time'
      }

      render(<EventDetails event={eventWithInvalidTime} />)
      
      // Should still render the component without crashing
      expect(screen.getByRole('heading', { name: 'Wedding Celebration' })).toBeInTheDocument()
      
      // Should show fallback time display
      expect(screen.getByText('invalid-time')).toBeInTheDocument()
    })

    it('should handle extremely long descriptions', () => {
      const eventWithVeryLongDescription = {
        ...baseEvent,
        description: 'A'.repeat(1000) // Very long description
      }

      render(<EventDetails event={eventWithVeryLongDescription} />)
      
      // Should not crash and should render the description
      expect(screen.getByText(/A{50,}/)).toBeInTheDocument()
    })
  })
})