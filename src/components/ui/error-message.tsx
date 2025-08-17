import { AlertCircle, XCircle, WifiOff, Clock, RefreshCcw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  error: string | Error
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ error, onRetry, className }: ErrorMessageProps) {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  // Determine error type and provide helpful messaging
  const getErrorDetails = () => {
    const lowerError = errorMessage.toLowerCase()
    
    if (lowerError.includes('network') || lowerError.includes('fetch')) {
      return {
        icon: WifiOff,
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200'
      }
    }
    
    if (lowerError.includes('expired') || lowerError.includes('passed')) {
      return {
        icon: Clock,
        title: 'Event Has Passed',
        message: 'This event has already occurred. RSVP responses are no longer being accepted.',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 border-gray-200'
      }
    }
    
    if (lowerError.includes('invalid') || lowerError.includes('not found')) {
      return {
        icon: XCircle,
        title: 'Invalid Link',
        message: 'This RSVP link is invalid or has expired. Please contact the event organizer for assistance.',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      }
    }
    
    if (lowerError.includes('required') || lowerError.includes('validation')) {
      return {
        icon: AlertCircle,
        title: 'Missing Information',
        message: errorMessage,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200'
      }
    }
    
    // Default error
    return {
      icon: AlertCircle,
      title: 'Something Went Wrong',
      message: errorMessage || 'An unexpected error occurred. Please try again.',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200'
    }
  }
  
  const errorDetails = getErrorDetails()
  const Icon = errorDetails.icon
  
  return (
    <Alert className={cn(
      "border",
      errorDetails.bgColor,
      className
    )}>
      <Icon className={cn("h-4 w-4", errorDetails.color)} />
      <AlertTitle className={errorDetails.color}>
        {errorDetails.title}
      </AlertTitle>
      <AlertDescription className="mt-2">
        {errorDetails.message}
      </AlertDescription>
      {onRetry && (
        <div className="mt-4">
          <Button 
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCcw className="h-3 w-3" />
            Try Again
          </Button>
        </div>
      )}
    </Alert>
  )
}

export function InlineError({ error, className }: { error: string; className?: string }) {
  return (
    <div className={cn(
      "flex items-start gap-2 text-sm text-red-600 mt-2",
      className
    )}>
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Connection Lost
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        We're having trouble connecting to our servers. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry Connection
        </Button>
      )}
    </div>
  )
}

interface NotFoundErrorProps {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function NotFoundError({ 
  title = 'Not Found',
  message = "The page you're looking for doesn't exist.",
  actionLabel = 'Go Home',
  onAction
}: NotFoundErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <XCircle className="h-8 w-8 text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        {message}
      </p>
      {onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}