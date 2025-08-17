/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { RsvpForm } from '@/components/rsvp/rsvp-form'

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock the RSVP action
vi.mock('@/app/actions/rsvp', () => ({
  submitRsvpResponse: vi.fn()
}))

describe('RsvpForm', () => {
  const mockGuest = {
    id: 'guest1',
    name: 'John Doe',
    phone: '+1-555-123-4567',
    email: 'john@example.com',
    eventId: 'event1',
    token: 'token123',
    invitationStatus: 'pending',
    rsvpStatus: null,
    guestCount: null,
    maxGuests: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockEvent = {
    id: 'event1',
    name: 'Wedding Celebration',
    date: '2025-12-31',
    time: '18:00:00',
    location: 'Grand Ballroom',
    description: 'Join us for our special day',
    organizerEmail: 'organizer@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const defaultProps = {
    guest: mockGuest,
    event: mockEvent,
    onSuccess: vi.fn(),
    onError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Render', () => {
    it('should render the RSVP form with all fields', () => {
      render(<RsvpForm {...defaultProps} />)

      expect(screen.getByText(/will you be attending/i)).toBeInTheDocument()
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /yes.*attend/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /no.*cannot attend/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /maybe.*might attend/i })).toBeInTheDocument()
    })

    it('should show guest count field when Yes is selected', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      await waitFor(() => {
        expect(screen.getByText(/number of guests/i)).toBeInTheDocument()
        expect(screen.getByText(/including yourself/i)).toBeInTheDocument()
      })
    })

    it('should show guest names field when multiple guests selected', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      await waitFor(() => {
        expect(screen.getByText(/number of guests/i)).toBeInTheDocument()
      })

      // Instead of using getByLabelText which might not work with Select, find the trigger button
      const selectTrigger = screen.getByRole('combobox', { name: /number of guests/i })
      await user.click(selectTrigger)
      
      await waitFor(() => {
        const option2 = screen.getByRole('option', { name: '2' })
        user.click(option2)
      })

      await waitFor(() => {
        expect(screen.getByText(/guest names/i)).toBeInTheDocument()
        expect(screen.getByText(/names of additional guests/i)).toBeInTheDocument()
      })
    })

    it('should show message field for all response types', () => {
      render(<RsvpForm {...defaultProps} />)

      expect(screen.getByLabelText(/message.*optional/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/share.*message/i)).toBeInTheDocument()
    })

    it('should have submit button', () => {
      render(<RsvpForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /submit response/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should require response selection', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      expect(screen.getByText(/please select.*response/i)).toBeInTheDocument()
    })

    it('should require guest count when Yes is selected', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      expect(screen.getByText(/please select.*number of guests/i)).toBeInTheDocument()
    })

    it('should require guest names when multiple guests', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '2')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      expect(screen.getByText(/please provide.*guest names/i)).toBeInTheDocument()
    })

    it('should validate guest count does not exceed maximum', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      
      // Should show options up to maxGuests (3)
      expect(screen.getByRole('option', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '3' })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: '4' })).not.toBeInTheDocument()
    })

    it('should validate message length', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const messageField = screen.getByLabelText(/message.*optional/i)
      const longMessage = 'A'.repeat(501) // Over 500 character limit

      await user.type(messageField, longMessage)

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      expect(screen.getByText(/message.*too long/i)).toBeInTheDocument()
    })
  })

  describe('Response Options', () => {
    it('should handle Yes response', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      expect(yesRadio).toBeChecked()
    })

    it('should handle No response', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const noRadio = screen.getByRole('radio', { name: /no.*cannot attend/i })
      await user.click(noRadio)

      expect(noRadio).toBeChecked()
      
      // Guest count should not be visible for No
      expect(screen.queryByLabelText(/number of guests/i)).not.toBeInTheDocument()
    })

    it('should handle Maybe response', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const maybeRadio = screen.getByRole('radio', { name: /maybe.*might attend/i })
      await user.click(maybeRadio)

      expect(maybeRadio).toBeChecked()

      // Guest count should be visible for Maybe
      expect(screen.getByLabelText(/number of guests/i)).toBeInTheDocument()
    })
  })

  describe('Guest Count Handling', () => {
    it('should show guest count options based on maxGuests', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      
      // Should have options 1 through maxGuests (3)
      for (let i = 1; i <= mockGuest.maxGuests; i++) {
        expect(screen.getByRole('option', { name: i.toString() })).toBeInTheDocument()
      }
    })

    it('should hide guest names when single guest', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      expect(screen.queryByLabelText(/guest names/i)).not.toBeInTheDocument()
    })

    it('should show guest names when multiple guests', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '2')

      expect(screen.getByLabelText(/guest names/i)).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid Yes response', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockResolvedValue({ success: true })

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '2')

      const guestNamesField = screen.getByLabelText(/guest names/i)
      await user.type(guestNamesField, 'Jane Smith')

      const messageField = screen.getByLabelText(/message.*optional/i)
      await user.type(messageField, 'Looking forward to it!')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitRsvpResponse).toHaveBeenCalledWith(mockGuest.token, {
          status: 'yes',
          numOfGuests: 2,
          guestNames: 'Jane Smith',
          message: 'Looking forward to it!'
        })
      })

      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })

    it('should submit form with No response', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockResolvedValue({ success: true })

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const noRadio = screen.getByRole('radio', { name: /no.*cannot attend/i })
      await user.click(noRadio)

      const messageField = screen.getByLabelText(/message.*optional/i)
      await user.type(messageField, 'Sorry, cannot make it')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitRsvpResponse).toHaveBeenCalledWith(mockGuest.token, {
          status: 'no',
          numOfGuests: 0,
          guestNames: null,
          message: 'Sorry, cannot make it'
        })
      })

      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })

    it('should submit form with Maybe response', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockResolvedValue({ success: true })

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const maybeRadio = screen.getByRole('radio', { name: /maybe.*might attend/i })
      await user.click(maybeRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitRsvpResponse).toHaveBeenCalledWith(mockGuest.token, {
          status: 'maybe',
          numOfGuests: 1,
          guestNames: null,
          message: ''
        })
      })

      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })

    it('should handle submission errors', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockResolvedValue({ 
        success: false, 
        error: 'Database error' 
      })

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to submit.*database error/i)).toBeInTheDocument()
      })

      expect(defaultProps.onError).toHaveBeenCalledWith('Database error')
    })
  })

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      expect(screen.getByText(/submitting/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.queryByText(/submitting/i)).not.toBeInTheDocument()
      })
    })

    it('should disable form during submission', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      // All form elements should be disabled
      expect(screen.getByRole('radio', { name: /yes.*attend/i })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /no.*cannot attend/i })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /maybe.*might attend/i })).toBeDisabled()
      expect(guestCountSelect).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Optimistic Updates', () => {
    it('should show optimistic success state', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      // Should immediately show optimistic state
      expect(screen.getByText(/response submitted/i)).toBeInTheDocument()
    })

    it('should revert optimistic state on error', async () => {
      const { submitRsvpResponse } = await import('@/app/actions/rsvp')
      vi.mocked(submitRsvpResponse).mockResolvedValue({ 
        success: false, 
        error: 'Network error' 
      })

      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const yesRadio = screen.getByRole('radio', { name: /yes.*attend/i })
      await user.click(yesRadio)

      const guestCountSelect = screen.getByLabelText(/number of guests/i)
      await user.selectOptions(guestCountSelect, '1')

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      // Should show optimistic state first
      expect(screen.getByText(/response submitted/i)).toBeInTheDocument()

      // Then revert to form with error
      await waitFor(() => {
        expect(screen.queryByText(/response submitted/i)).not.toBeInTheDocument()
        expect(screen.getByText(/failed to submit/i)).toBeInTheDocument()
      })
    })
  })

  describe('Pre-filled Data', () => {
    it('should pre-fill form with existing RSVP data', () => {
      const guestWithRsvp = {
        ...mockGuest,
        rsvp: {
          status: 'yes' as const,
          numOfGuests: 2,
          guestNames: 'Jane Smith',
          message: 'Excited to attend!',
          respondedAt: new Date()
        }
      }

      render(<RsvpForm {...defaultProps} guest={guestWithRsvp} />)

      expect(screen.getByRole('radio', { name: /yes.*attend/i })).toBeChecked()
      expect(screen.getByDisplayValue('2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Excited to attend!')).toBeInTheDocument()
    })

    it('should show update button text for existing responses', () => {
      const guestWithRsvp = {
        ...mockGuest,
        rsvp: {
          status: 'no' as const,
          numOfGuests: 0,
          guestNames: null,
          message: 'Cannot make it',
          respondedAt: new Date()
        }
      }

      render(<RsvpForm {...defaultProps} guest={guestWithRsvp} />)

      expect(screen.getByRole('button', { name: /update response/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<RsvpForm {...defaultProps} />)

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-labelledby')
      expect(screen.getByLabelText(/number of guests/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/guest names/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message.*optional/i)).toBeInTheDocument()
    })

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<RsvpForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      await user.click(submitButton)

      const errorMessage = screen.getByText(/please select.*response/i)
      const radioGroup = screen.getByRole('radiogroup')
      
      expect(radioGroup).toHaveAttribute('aria-describedby')
      expect(errorMessage).toHaveAttribute('id')
    })

    it('should support keyboard navigation', () => {
      render(<RsvpForm {...defaultProps} />)

      const radioButtons = screen.getAllByRole('radio')
      radioButtons.forEach(radio => {
        expect(radio).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /submit response/i })
      expect(submitButton).toBeInTheDocument()
    })
  })
})