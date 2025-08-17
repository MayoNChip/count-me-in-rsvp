import { GuestWithRsvp } from '@/lib/data/guests'

export function exportGuestsToCSV(guests: GuestWithRsvp[], eventName: string) {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Max Guests',
    'Notes',
    'RSVP Status',
    'Attending Guests',
    'Guest Names',
    'RSVP Message',
    'Responded At'
  ]

  const csvData = guests.map(guest => [
    guest.name,
    guest.email || '',
    guest.phone || '',
    guest.maxGuests.toString(),
    guest.notes || '',
    guest.rsvp?.status || 'No Response',
    guest.rsvp?.numOfGuests?.toString() || '',
    guest.rsvp?.guestNames || '',
    guest.rsvp?.message || '',
    guest.rsvp?.respondedAt ? new Date(guest.rsvp.respondedAt).toLocaleDateString() : ''
  ])

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => 
      row.map(field => 
        // Escape fields that contain commas, quotes, or newlines
        field.includes(',') || field.includes('"') || field.includes('\n')
          ? `"${field.replace(/"/g, '""')}"`
          : field
      ).join(',')
    )
  ].join('\n')

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_guests_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export function exportGuestListToCSV(guests: GuestWithRsvp[], eventName: string, filterStatus?: string) {
  let filteredGuests = guests

  // Apply filter if specified
  if (filterStatus && filterStatus !== 'all') {
    filteredGuests = guests.filter(guest => {
      switch (filterStatus) {
        case 'pending':
          return !guest.rsvp
        case 'yes':
          return guest.rsvp?.status === 'yes'
        case 'no':
          return guest.rsvp?.status === 'no'
        case 'maybe':
          return guest.rsvp?.status === 'maybe'
        default:
          return true
      }
    })
  }

  const suffix = filterStatus && filterStatus !== 'all' ? `_${filterStatus}` : ''
  const fileName = `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_guests${suffix}_${new Date().toISOString().split('T')[0]}.csv`

  exportGuestsToCSV(filteredGuests, fileName.replace('.csv', ''))
}

export function parseGuestCSV(csvText: string) {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  const guests = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const guest: any = {}
    
    headers.forEach((header, index) => {
      const value = values[index] || ''
      
      switch (header) {
        case 'name':
          guest.name = value
          break
        case 'email':
          if (value && value !== '') guest.email = value
          break
        case 'phone':
          if (value && value !== '') guest.phone = value
          break
        case 'maxguests':
        case 'max_guests':
        case 'max guests':
          guest.maxGuests = parseInt(value) || 1
          break
        case 'notes':
          if (value && value !== '') guest.notes = value
          break
      }
    })
    
    if (guest.name && guest.name.trim() !== '') {
      guests.push(guest)
    }
  }
  
  return guests
}