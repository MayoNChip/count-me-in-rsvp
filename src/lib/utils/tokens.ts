import { randomBytes } from 'crypto'

/**
 * Generate a secure random token for guest RSVP links
 * @param length - Length of the token (default: 32)
 * @returns A URL-safe base64 token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/[+/=]/g, '') // Remove URL-unsafe characters
    .substring(0, length)
}

/**
 * Generate a short, human-readable token
 * @param length - Length of the token (default: 8)
 * @returns An alphanumeric token
 */
export function generateShortToken(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Create a shareable RSVP URL for a guest
 * @param token - The guest's unique token
 * @param baseUrl - The base URL of the application
 * @returns A complete RSVP URL
 */
export function createRsvpUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${base}/rsvp/${token}`
}