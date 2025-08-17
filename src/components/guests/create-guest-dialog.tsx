'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { createGuestSchema, type CreateGuestInput } from '@/lib/validations/guests'
import { createGuest } from '@/app/actions/guests'
import { Loader2, User, Mail, Phone, Users, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface CreateGuestDialogProps {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGuestDialog({ eventId, open, onOpenChange }: CreateGuestDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<CreateGuestInput>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      eventId,
      name: '',
      email: '',
      phone: '',
      maxGuests: 1,
      notes: '',
    },
  })

  const onSubmit = async (data: CreateGuestInput) => {
    setIsLoading(true)
    
    try {
      const result = await createGuest(data)
      
      if (result.success) {
        toast.success('Guest created successfully!')
        form.reset()
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create guest')
      }
    } catch (error) {
      console.error('Create guest error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] modern-card border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Add New Guest</DialogTitle>
          <DialogDescription className="text-slate-600">
            Add a new guest to your event invitation list.
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
                    Creating...
                  </>
                ) : (
                  'Create Guest'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}