'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { updateGuestSchema, type UpdateGuestInput } from '@/lib/validations/guests'
import { updateGuest } from '@/app/actions/guests'
import { GuestWithRsvp } from '@/lib/data/guests'
import { Loader2, User, Mail, Phone, Users, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface EditGuestDialogProps {
  guest: GuestWithRsvp
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditGuestDialog({ guest, open, onOpenChange }: EditGuestDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<UpdateGuestInput>({
    resolver: zodResolver(updateGuestSchema),
    defaultValues: {
      id: guest.id,
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone || '',
      maxGuests: guest.maxGuests,
      notes: guest.notes || '',
    },
  })

  const onSubmit = async (data: UpdateGuestInput) => {
    setIsLoading(true)
    
    try {
      const result = await updateGuest(data)
      
      if (result.success) {
        toast.success('Guest updated successfully!')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update guest')
      }
    } catch (error) {
      console.error('Update guest error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] modern-card border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Edit Guest</DialogTitle>
          <DialogDescription className="text-slate-600">
            Update the guest information for your event.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Guest Name
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter guest's full name"
                      className="clean-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="guest@example.com (optional)"
                      className="clean-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567 (optional)"
                      className="clean-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Maximum Guests
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      className="clean-input"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special notes about this guest (optional)"
                      className="clean-input min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {guest.rsvp && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-slate-800 mb-2">RSVP Status</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <div>Status: <span className="font-medium">{guest.rsvp.status}</span></div>
                  <div>Guests: <span className="font-medium">{guest.rsvp.numOfGuests}</span></div>
                  {guest.rsvp.guestNames && (
                    <div>Names: <span className="font-medium">{guest.rsvp.guestNames}</span></div>
                  )}
                  {guest.rsvp.message && (
                    <div>Message: <span className="font-medium">{guest.rsvp.message}</span></div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-3">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-clean"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Guest'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}