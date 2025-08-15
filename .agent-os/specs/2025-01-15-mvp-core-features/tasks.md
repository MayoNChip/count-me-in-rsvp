# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-01-15-mvp-core-features/spec.md

> Created: 2025-01-15
> Status: Ready for Implementation

## Tasks

- [x] 1. Setup Project Foundation
  - [x] 1.1 Install and configure Drizzle ORM with PostgreSQL client
  - [x] 1.2 Install TanStack Query and setup providers
  - [x] 1.3 Install shadcn/ui and configure components
  - [x] 1.4 Install form libraries (react-hook-form, zod)
  - [x] 1.5 Setup environment variables for database connection
  - [x] 1.6 Configure Drizzle config and setup database connection
  - [x] 1.7 Create basic layout structure with navigation
  - [x] 1.8 Verify all dependencies are working

- [ ] 2. Database Setup and Migrations
  - [ ] 2.1 Write tests for database schema
  - [ ] 2.2 Create PostgreSQL database (Supabase) and get credentials
  - [ ] 2.3 Create Drizzle schema for events table
  - [ ] 2.4 Create Drizzle schema for guests table
  - [ ] 2.5 Create Drizzle schema for rsvp_responses table
  - [ ] 2.6 Generate and run migrations with drizzle-kit
  - [ ] 2.7 Setup database indexes and constraints
  - [ ] 2.8 Verify all migrations and test with sample data

- [ ] 3. Event Management System
  - [ ] 3.1 Write tests for event Server Actions
  - [ ] 3.2 Create event Server Actions (create, update, delete)
  - [ ] 3.3 Create event creation form with validation
  - [ ] 3.4 Create event dashboard page layout
  - [ ] 3.5 Implement event list view
  - [ ] 3.6 Add event edit functionality
  - [ ] 3.7 Verify all event tests pass

- [ ] 4. Guest Management System
  - [ ] 4.1 Write tests for guest Server Actions
  - [ ] 4.2 Create guest Server Actions (add, update, delete, bulk add)
  - [ ] 4.3 Implement token generation for RSVP links
  - [ ] 4.4 Create guest management UI with table
  - [ ] 4.5 Implement add guest form with max guests field
  - [ ] 4.6 Implement bulk guest import functionality
  - [ ] 4.7 Create guest edit/delete functionality
  - [ ] 4.8 Verify all guest tests pass

- [ ] 5. RSVP Response System
  - [ ] 5.1 Write tests for RSVP Server Actions
  - [ ] 5.2 Create RSVP Server Actions (submit, get by token)
  - [ ] 5.3 Create RSVP page layout and routing
  - [ ] 5.4 Implement RSVP form with number of guests input
  - [ ] 5.5 Add guest names field (optional)
  - [ ] 5.6 Create confirmation page after submission
  - [ ] 5.7 Implement response update functionality
  - [ ] 5.8 Verify all RSVP tests pass

- [ ] 6. Dashboard and Statistics
  - [ ] 6.1 Write tests for statistics calculations
  - [ ] 6.2 Create data fetching functions for dashboard
  - [ ] 6.3 Implement guest list with status display
  - [ ] 6.4 Create summary statistics component
  - [ ] 6.5 Show total headcount including all guests
  - [ ] 6.6 Add filtering and sorting capabilities
  - [ ] 6.7 Implement refresh functionality
  - [ ] 6.8 Verify all dashboard tests pass

- [ ] 7. Homepage and Navigation
  - [ ] 7.1 Write tests for homepage components
  - [ ] 7.2 Create homepage layout and design
  - [ ] 7.3 Implement navigation between pages
  - [ ] 7.4 Add hero section with call-to-action
  - [ ] 7.5 Create footer with essential links
  - [ ] 7.6 Ensure responsive design
  - [ ] 7.7 Verify all homepage tests pass

- [ ] 8. Polish and Error Handling
  - [ ] 8.1 Write tests for error scenarios
  - [ ] 8.2 Implement loading states throughout
  - [ ] 8.3 Add error boundaries and error pages
  - [ ] 8.4 Create toast notifications for actions
  - [ ] 8.5 Add form validation feedback
  - [ ] 8.6 Implement 404 page for invalid tokens
  - [ ] 8.7 Test accessibility features
  - [ ] 8.8 Verify all error handling tests pass

## Task Dependencies

- Task 1 (Setup) must be completed first
- Task 2 (Database) depends on Task 1
- Tasks 3, 4, 5 (Features) depend on Task 2
- Task 6 (Dashboard) depends on Tasks 3, 4, 5
- Task 7 (Homepage) can be done in parallel with Tasks 3-6
- Task 8 (Polish) should be done last

## Notes

- Follow TDD approach: write tests first, then implementation
- Each major task should result in a working feature
- Commit after each major task completion
- Use Server Components by default, Client Components only where needed
- Ensure mobile responsiveness throughout
- Validate against maxGuests limit when processing RSVPs