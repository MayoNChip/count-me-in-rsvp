'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bulkImportGuests } from '@/app/actions/guests'
import { Upload, Download, FileText, AlertCircle, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface ImportGuestsDialogProps {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ParsedGuest = {
  name: string
  email?: string
  phone?: string
  maxGuests?: number
  notes?: string
  isValid: boolean
  errors: string[]
}

export function ImportGuestsDialog({ eventId, open, onOpenChange }: ImportGuestsDialogProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [parsedGuests, setParsedGuests] = useState<ParsedGuest[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')

  const downloadTemplate = () => {
    const template = `name,email,phone,maxGuests,notes
John Doe,john@example.com,+1234567890,2,VIP guest
Jane Smith,jane@example.com,,1,
Bob Johnson,,+1987654321,3,Family friend`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'guest-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (csvText: string): ParsedGuest[] => {
    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const guests: ParsedGuest[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const guest: ParsedGuest = {
        name: '',
        isValid: true,
        errors: []
      }
      
      headers.forEach((header, index) => {
        const value = values[index] || ''
        
        switch (header) {
          case 'name':
            guest.name = value
            if (!value) {
              guest.isValid = false
              guest.errors.push('Name is required')
            }
            break
          case 'email':
            if (value) {
              guest.email = value
              // Basic email validation
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                guest.isValid = false
                guest.errors.push('Invalid email format')
              }
            }
            break
          case 'phone':
            if (value) guest.phone = value
            break
          case 'maxguests':
          case 'max_guests':
            const maxGuests = parseInt(value) || 1
            guest.maxGuests = maxGuests
            if (maxGuests < 1 || maxGuests > 10) {
              guest.isValid = false
              guest.errors.push('Max guests must be between 1 and 10')
            }
            break
          case 'notes':
            if (value) guest.notes = value
            break
        }
      })
      
      if (guest.name) { // Only add guests with names
        guests.push(guest)
      }
    }
    
    return guests
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const csvText = event.target?.result as string
      try {
        const parsed = parseCSV(csvText)
        setParsedGuests(parsed)
        setStep('preview')
      } catch (error) {
        toast.error('Error parsing CSV file')
        console.error('CSV parse error:', error)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    const validGuests = parsedGuests.filter(g => g.isValid)
    if (validGuests.length === 0) {
      toast.error('No valid guests to import')
      return
    }

    setStep('importing')
    setIsProcessing(true)

    try {
      const guestsToImport = validGuests.map(guest => ({
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        maxGuests: guest.maxGuests || 1,
        notes: guest.notes
      }))

      const result = await bulkImportGuests({
        eventId,
        guests: guestsToImport
      })

      if (result.success) {
        toast.success(`Successfully imported ${result.data?.imported || 0} guests!`)
        onOpenChange(false)
        router.refresh()
        resetDialog()
      } else {
        toast.error(result.error || 'Failed to import guests')
        setStep('preview')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('An unexpected error occurred')
      setStep('preview')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetDialog = () => {
    setFile(null)
    setParsedGuests([])
    setStep('upload')
    setIsProcessing(false)
  }

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false)
      resetDialog()
    }
  }

  const validCount = parsedGuests.filter(g => g.isValid).length
  const invalidCount = parsedGuests.length - validCount

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] modern-card border-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Import Guests</DialogTitle>
          <DialogDescription className="text-slate-600">
            Upload a CSV file to import multiple guests at once.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Need a template?</p>
                <p className="text-xs text-blue-600">Download our CSV template to get started</p>
              </div>
              <Button
                onClick={downloadTemplate}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-xl"
              >
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>

            <div>
              <Label className="text-slate-700 font-medium">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="h-4 w-4" />
                  Select CSV File
                </div>
              </Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="clean-input"
              />
              <p className="text-xs text-slate-500 mt-2">
                Supported columns: name (required), email, phone, maxGuests, notes
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{validCount} Valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">{invalidCount} Invalid</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-slate-600">Total: {parsedGuests.length}</span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {parsedGuests.map((guest, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    guest.isValid 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{guest.name || 'No name'}</p>
                      <div className="text-sm text-slate-600">
                        {guest.email && <span>{guest.email}</span>}
                        {guest.phone && <span> • {guest.phone}</span>}
                        <span> • Max: {guest.maxGuests || 1}</span>
                      </div>
                    </div>
                    {guest.isValid ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                  </div>
                  {guest.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      {guest.errors.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
            <p className="text-lg font-medium text-slate-800">Importing guests...</p>
            <p className="text-sm text-slate-600">Please wait while we process your file</p>
          </div>
        )}

        <DialogFooter className="gap-3">
          {step === 'upload' && (
            <Button
              onClick={handleClose}
              className="btn-clean"
            >
              Cancel
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button
                onClick={() => setStep('upload')}
                className="btn-clean"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-xl px-6"
              >
                Import {validCount} Guest{validCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}