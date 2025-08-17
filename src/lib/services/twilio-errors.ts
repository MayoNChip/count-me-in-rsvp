/**
 * Twilio Error Codes and Handling
 * Reference: https://www.twilio.com/docs/api/errors
 */

export enum TwilioErrorCode {
  // Authentication Errors
  AUTHENTICATION_ERROR = 20003,
  
  // Phone Number Errors  
  INVALID_PHONE_NUMBER = 21211,
  UNVERIFIED_PHONE_NUMBER = 21421,
  PHONE_NUMBER_BLACKLISTED = 21610,
  
  // WhatsApp Specific Errors
  WHATSAPP_TEMPLATE_NOT_APPROVED = 63001,
  WHATSAPP_RECIPIENT_NOT_ON_WHATSAPP = 63003,
  WHATSAPP_DAILY_LIMIT_REACHED = 63004,
  WHATSAPP_TEMPLATE_PARAM_COUNT_MISMATCH = 63007,
  WHATSAPP_RECIPIENT_NOT_IN_ALLOWED_LIST = 63008,
  WHATSAPP_RATE_LIMIT_EXCEEDED = 63010,
  WHATSAPP_MESSAGE_FAILED = 63016,
  WHATSAPP_MEDIA_SIZE_TOO_LARGE = 63018,
  
  // Message Errors
  MESSAGE_RATE_LIMIT = 21408,
  MESSAGE_TOO_LONG = 21617,
  
  // Queue Errors
  QUEUE_OVERFLOW = 30001,
  
  // General Errors
  INTERNAL_ERROR = 30003,
  SERVICE_UNAVAILABLE = 30545,
}

export interface TwilioErrorDetails {
  code: TwilioErrorCode
  message: string
  isRetryable: boolean
  userMessage: string
  action?: string
}

export class TwilioErrorHandler {
  private static errorMap: Map<number, TwilioErrorDetails> = new Map([
    // Authentication Errors
    [TwilioErrorCode.AUTHENTICATION_ERROR, {
      code: TwilioErrorCode.AUTHENTICATION_ERROR,
      message: 'Authentication failed',
      isRetryable: false,
      userMessage: 'WhatsApp service configuration error. Please contact support.',
      action: 'Check Twilio credentials'
    }],
    
    // Phone Number Errors
    [TwilioErrorCode.INVALID_PHONE_NUMBER, {
      code: TwilioErrorCode.INVALID_PHONE_NUMBER,
      message: 'Invalid phone number',
      isRetryable: false,
      userMessage: 'The phone number provided is invalid. Please check and try again.',
      action: 'Verify phone number format'
    }],
    
    [TwilioErrorCode.UNVERIFIED_PHONE_NUMBER, {
      code: TwilioErrorCode.UNVERIFIED_PHONE_NUMBER,
      message: 'Phone number not verified',
      isRetryable: false,
      userMessage: 'This phone number needs to be verified before sending messages.',
      action: 'Verify phone number with Twilio'
    }],
    
    [TwilioErrorCode.PHONE_NUMBER_BLACKLISTED, {
      code: TwilioErrorCode.PHONE_NUMBER_BLACKLISTED,
      message: 'Phone number is blacklisted',
      isRetryable: false,
      userMessage: 'Unable to send message to this phone number.',
      action: 'Contact recipient through alternative method'
    }],
    
    // WhatsApp Specific Errors
    [TwilioErrorCode.WHATSAPP_TEMPLATE_NOT_APPROVED, {
      code: TwilioErrorCode.WHATSAPP_TEMPLATE_NOT_APPROVED,
      message: 'WhatsApp template not approved',
      isRetryable: false,
      userMessage: 'Message template pending approval. Please try again later.',
      action: 'Submit template for WhatsApp approval'
    }],
    
    [TwilioErrorCode.WHATSAPP_RECIPIENT_NOT_ON_WHATSAPP, {
      code: TwilioErrorCode.WHATSAPP_RECIPIENT_NOT_ON_WHATSAPP,
      message: 'Recipient not on WhatsApp',
      isRetryable: false,
      userMessage: 'This phone number is not registered on WhatsApp.',
      action: 'Use alternative communication method'
    }],
    
    [TwilioErrorCode.WHATSAPP_DAILY_LIMIT_REACHED, {
      code: TwilioErrorCode.WHATSAPP_DAILY_LIMIT_REACHED,
      message: 'Daily message limit reached',
      isRetryable: true,
      userMessage: 'Daily message limit reached. Messages will be sent tomorrow.',
      action: 'Wait 24 hours before retrying'
    }],
    
    [TwilioErrorCode.WHATSAPP_TEMPLATE_PARAM_COUNT_MISMATCH, {
      code: TwilioErrorCode.WHATSAPP_TEMPLATE_PARAM_COUNT_MISMATCH,
      message: 'Template parameter count mismatch',
      isRetryable: false,
      userMessage: 'Message template error. Please contact support.',
      action: 'Fix template variable mapping'
    }],
    
    [TwilioErrorCode.WHATSAPP_RECIPIENT_NOT_IN_ALLOWED_LIST, {
      code: TwilioErrorCode.WHATSAPP_RECIPIENT_NOT_IN_ALLOWED_LIST,
      message: 'Recipient not in allowed list (sandbox mode)',
      isRetryable: false,
      userMessage: 'Recipient needs to opt-in to receive WhatsApp messages.',
      action: 'Add recipient to sandbox or upgrade account'
    }],
    
    [TwilioErrorCode.WHATSAPP_RATE_LIMIT_EXCEEDED, {
      code: TwilioErrorCode.WHATSAPP_RATE_LIMIT_EXCEEDED,
      message: 'WhatsApp rate limit exceeded',
      isRetryable: true,
      userMessage: 'Sending too many messages. Please wait a moment.',
      action: 'Implement rate limiting'
    }],
    
    [TwilioErrorCode.WHATSAPP_MESSAGE_FAILED, {
      code: TwilioErrorCode.WHATSAPP_MESSAGE_FAILED,
      message: 'WhatsApp message failed',
      isRetryable: true,
      userMessage: 'Failed to send WhatsApp message. Will retry.',
      action: 'Retry message delivery'
    }],
    
    [TwilioErrorCode.WHATSAPP_MEDIA_SIZE_TOO_LARGE, {
      code: TwilioErrorCode.WHATSAPP_MEDIA_SIZE_TOO_LARGE,
      message: 'Media file too large',
      isRetryable: false,
      userMessage: 'Media file size exceeds WhatsApp limits.',
      action: 'Reduce media file size'
    }],
    
    // Message Errors
    [TwilioErrorCode.MESSAGE_RATE_LIMIT, {
      code: TwilioErrorCode.MESSAGE_RATE_LIMIT,
      message: 'Message rate limit exceeded',
      isRetryable: true,
      userMessage: 'Sending messages too quickly. Please wait.',
      action: 'Implement rate limiting'
    }],
    
    [TwilioErrorCode.MESSAGE_TOO_LONG, {
      code: TwilioErrorCode.MESSAGE_TOO_LONG,
      message: 'Message body too long',
      isRetryable: false,
      userMessage: 'Message exceeds maximum length.',
      action: 'Shorten message content'
    }],
    
    // Queue Errors
    [TwilioErrorCode.QUEUE_OVERFLOW, {
      code: TwilioErrorCode.QUEUE_OVERFLOW,
      message: 'Message queue overflow',
      isRetryable: true,
      userMessage: 'Service is busy. Your message will be sent shortly.',
      action: 'Retry after delay'
    }],
    
    // General Errors
    [TwilioErrorCode.INTERNAL_ERROR, {
      code: TwilioErrorCode.INTERNAL_ERROR,
      message: 'Internal Twilio error',
      isRetryable: true,
      userMessage: 'Temporary service issue. Please try again.',
      action: 'Retry request'
    }],
    
    [TwilioErrorCode.SERVICE_UNAVAILABLE, {
      code: TwilioErrorCode.SERVICE_UNAVAILABLE,
      message: 'Service temporarily unavailable',
      isRetryable: true,
      userMessage: 'WhatsApp service is temporarily unavailable.',
      action: 'Retry after service recovery'
    }],
  ])

  /**
   * Get error details for a specific error code
   */
  static getErrorDetails(code: number): TwilioErrorDetails | undefined {
    return this.errorMap.get(code)
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(code: number): boolean {
    const details = this.getErrorDetails(code)
    return details?.isRetryable ?? false
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(code: number): string {
    const details = this.getErrorDetails(code)
    return details?.userMessage ?? 'An error occurred sending the message. Please try again.'
  }

  /**
   * Parse Twilio error response
   */
  static parseTwilioError(error: any): {
    code: number
    message: string
    details?: TwilioErrorDetails
  } {
    // Handle Twilio REST exception format
    if (error.code && typeof error.code === 'number') {
      return {
        code: error.code,
        message: error.message || 'Unknown error',
        details: this.getErrorDetails(error.code)
      }
    }
    
    // Handle standard error format
    if (error.response?.data?.code) {
      const code = error.response.data.code
      return {
        code,
        message: error.response.data.message || 'Unknown error',
        details: this.getErrorDetails(code)
      }
    }
    
    // Fallback for unknown error format
    return {
      code: 0,
      message: error.message || 'Unknown error',
      details: undefined
    }
  }

  /**
   * Calculate retry delay based on error type
   */
  static getRetryDelay(code: number, attemptNumber: number): number | null {
    const details = this.getErrorDetails(code)
    
    if (!details?.isRetryable) {
      return null
    }
    
    // Special handling for specific errors
    switch (code) {
      case TwilioErrorCode.WHATSAPP_DAILY_LIMIT_REACHED:
        // Wait until next day
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return tomorrow.getTime() - now.getTime()
        
      case TwilioErrorCode.WHATSAPP_RATE_LIMIT_EXCEEDED:
      case TwilioErrorCode.MESSAGE_RATE_LIMIT:
        // Wait progressively longer: 5s, 10s, 20s, 40s...
        return Math.min(5000 * Math.pow(2, attemptNumber - 1), 300000) // Max 5 minutes
        
      case TwilioErrorCode.QUEUE_OVERFLOW:
      case TwilioErrorCode.SERVICE_UNAVAILABLE:
        // Wait longer for service issues: 30s, 60s, 120s...
        return Math.min(30000 * Math.pow(2, attemptNumber - 1), 600000) // Max 10 minutes
        
      default:
        // Standard exponential backoff: 1min, 2min, 4min...
        return Math.min(60000 * Math.pow(2, attemptNumber - 1), 3600000) // Max 1 hour
    }
  }

  /**
   * Format error for logging
   */
  static formatErrorForLogging(error: any): string {
    const parsed = this.parseTwilioError(error)
    const details = parsed.details
    
    if (details) {
      return `Twilio Error ${parsed.code}: ${parsed.message} | Action: ${details.action || 'None'} | Retryable: ${details.isRetryable}`
    }
    
    return `Twilio Error ${parsed.code || 'Unknown'}: ${parsed.message}`
  }

  /**
   * Check if error indicates phone number issue
   */
  static isPhoneNumberError(code: number): boolean {
    return [
      TwilioErrorCode.INVALID_PHONE_NUMBER,
      TwilioErrorCode.UNVERIFIED_PHONE_NUMBER,
      TwilioErrorCode.PHONE_NUMBER_BLACKLISTED,
      TwilioErrorCode.WHATSAPP_RECIPIENT_NOT_ON_WHATSAPP,
      TwilioErrorCode.WHATSAPP_RECIPIENT_NOT_IN_ALLOWED_LIST
    ].includes(code)
  }

  /**
   * Check if error indicates template issue
   */
  static isTemplateError(code: number): boolean {
    return [
      TwilioErrorCode.WHATSAPP_TEMPLATE_NOT_APPROVED,
      TwilioErrorCode.WHATSAPP_TEMPLATE_PARAM_COUNT_MISMATCH
    ].includes(code)
  }

  /**
   * Check if error indicates rate limiting
   */
  static isRateLimitError(code: number): boolean {
    return [
      TwilioErrorCode.WHATSAPP_DAILY_LIMIT_REACHED,
      TwilioErrorCode.WHATSAPP_RATE_LIMIT_EXCEEDED,
      TwilioErrorCode.MESSAGE_RATE_LIMIT
    ].includes(code)
  }
}