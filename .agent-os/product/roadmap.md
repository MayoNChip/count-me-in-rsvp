# Product Roadmap

> Last Updated: 2025-08-15
> Version: 1.0.0
> Status: Planning

## Phase 1: Core MVP (1-2 weeks)

**Goal:** Build the essential RSVP functionality for a single event
**Success Criteria:** Can create an event, add guests, and collect RSVPs

### Must-Have Features

- [ ] Homepage with event overview - Design and implement landing page `S`
- [ ] Event creation with database setup - Create events table and API `M`
- [ ] Guest management system - Add guests table and CRUD operations `M`
- [ ] RSVP response page - Guest-facing form for responses `S`
- [ ] Guest list dashboard - View all guests and their status `S`

### Should-Have Features

- [ ] Basic authentication for event organizers - Protect admin routes `S`
- [ ] Unique RSVP links for guests - Generate secure guest tokens `XS`

### Dependencies

- Supabase project setup and configuration
- Database migrations for events and guests tables
- shadcn/ui components installation

## Phase 2: Enhanced User Experience (1 week)

**Goal:** Improve the interface and add response flexibility
**Success Criteria:** Polished UI with "Maybe" option and better UX

### Must-Have Features

- [ ] "Maybe" response option - Add uncertain status `XS`
- [ ] Response confirmation page - Show success after RSVP `XS`
- [ ] Mobile-responsive design - Optimize for all devices `S`
- [ ] Loading states and error handling - Better user feedback `S`

### Should-Have Features

- [ ] Guest can update their response - Allow status changes `S`
- [ ] Custom event themes - Basic styling options `M`

### Dependencies

- Phase 1 completion
- UI component library fully integrated

## Phase 3: Real-Time & Notifications (2 weeks)

**Goal:** Add live updates and communication features
**Success Criteria:** Real-time dashboard updates and guest notifications

### Must-Have Features

- [ ] Real-time status updates - Live dashboard refresh `M`
- [ ] Email notifications setup - Send RSVP invitations `M`
- [ ] Reminder system - Notify non-responders `M`
- [ ] Guest response history - Track status changes `S`

### Should-Have Features

- [ ] SMS notifications option - Alternative to email `L`
- [ ] Custom email templates - Personalized invitations `M`
- [ ] Bulk reminder sending - Contact multiple guests `S`

### Dependencies

- Supabase real-time subscriptions
- Email service integration (Resend/SendGrid)
- Background job processing

## Phase 4: Multi-Event & Analytics (2 weeks)

**Goal:** Support multiple events and provide insights
**Success Criteria:** Users can manage multiple events with analytics

### Must-Have Features

- [ ] Multiple event management - Handle various events `L`
- [ ] Event duplication - Copy existing events `S`
- [ ] Response analytics - Charts and statistics `M`
- [ ] Export guest list - Download CSV/Excel `S`

### Should-Have Features

- [ ] Event categories - Wedding, birthday, etc. `S`
- [ ] Guest groups/tables - Organize attendees `M`
- [ ] Dietary preferences tracking - Special requirements `M`

### Dependencies

- Robust authentication system
- Advanced database relationships
- Data visualization library

## Phase 5: Advanced Features (3+ weeks)

**Goal:** Add premium features for power users
**Success Criteria:** Full-featured event management platform

### Must-Have Features

- [ ] Plus-one management - Handle additional guests `M`
- [ ] QR code check-in - Event day management `L`
- [ ] Seating chart builder - Visual arrangement tool `XL`
- [ ] Multi-language support - Internationalization `L`

### Should-Have Features

- [ ] Payment integration - Paid events support `XL`
- [ ] Calendar integration - Sync with Google/Outlook `L`
- [ ] Custom domains - White-label solution `XL`
- [ ] API for developers - Third-party integrations `L`

### Dependencies

- All previous phases completed
- Additional third-party service integrations
- Advanced infrastructure setup