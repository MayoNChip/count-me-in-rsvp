import { format } from 'date-fns'

/**
 * Formats a phone number for WhatsApp by removing all non-digit characters
 * except '+' and ensuring it has a country code
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')

  // Remove empty or whitespace-only strings
  if (!cleaned.trim()) {
    return ''
  }

  // If it starts with +, remove the + and return the rest
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1)
  }

  // If it's already in international format (starts with country code)
  // US numbers: 11 digits starting with 1
  // Most international numbers: 10-15 digits not starting with 1
  if (cleaned.length >= 10) {
    // If it looks like a US number without country code (10 digits)
    if (cleaned.length === 10 && !cleaned.startsWith('1')) {
      return '1' + cleaned
    }
    // If it already has a country code or is international
    return cleaned
  }

  // For shorter numbers, don't assume US - return as is for edge cases
  if (cleaned.length > 0) {
    return cleaned
  }

  return ''
}

/**
 * Validates if a phone number is valid for WhatsApp
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }

  const formatted = formatPhoneForWhatsApp(phone)
  
  // Must have at least 7 digits (minimum valid phone number)
  // and at most 15 digits (international standard)
  return formatted.length >= 7 && formatted.length <= 15 && /^\d+$/.test(formatted)
}

/**
 * Creates a WhatsApp message with placeholders replaced by actual values
 */
export function createWhatsAppMessage(
  guest: { name: string; phone: string },
  event: { name: string; date: string; time?: string | null; location?: string | null },
  rsvpUrl: string,
  customTemplate?: string
): string {
  const defaultTemplate = `Hi {guestName}! 🎉

You're invited to {eventName} on {eventDate}${event.time ? ' at {eventTime}' : ''}${event.location ? ' at {eventLocation}' : ''}.

Please RSVP using this link: {rsvpUrl}

Looking forward to celebrating with you! 💫`

  const template = customTemplate || defaultTemplate

  // Format the date to a more readable format
  const eventDate = format(new Date(event.date), 'MMMM do, yyyy')
  
  // Format time if available
  const eventTime = event.time ? format(new Date(`2000-01-01T${event.time}`), 'h:mm a') : ''

  return template
    .replace(/\{guestName\}/g, guest.name)
    .replace(/\{eventName\}/g, event.name)
    .replace(/\{eventDate\}/g, eventDate)
    .replace(/\{eventTime\}/g, eventTime)
    .replace(/\{eventLocation\}/g, event.location || '')
    .replace(/\{rsvpUrl\}/g, rsvpUrl)
    // Clean up any extra spaces from missing data
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generates a WhatsApp URL with the phone number and encoded message
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone)
  
  if (!validatePhoneNumber(formattedPhone)) {
    return ''
  }

  const baseUrl = `https://wa.me/${formattedPhone}`
  
  if (!message || message.trim() === '') {
    return baseUrl
  }

  const encodedMessage = encodeURIComponent(message)
  return `${baseUrl}?text=${encodedMessage}`
}