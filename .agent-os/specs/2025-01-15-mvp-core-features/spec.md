# Spec Requirements Document

> Spec: MVP Core Features
> Created: 2025-01-15
> Status: Planning

## Overview

Implement the core MVP functionality for Count Me In, enabling event creation, guest management, and RSVP collection for a single event. This foundation will provide the essential features needed for managing wedding RSVPs with a clean, modern interface.

## User Stories

### Event Organizer Creates and Manages Event

As an event organizer, I want to create an event and manage my guest list, so that I can track attendance for my wedding.

The organizer visits the homepage, creates a new event with basic details (name, date, location), then adds guests to the event with their contact information. Each guest receives a unique RSVP link. The organizer can view a dashboard showing all guests and their current RSVP status in real-time.

### Guest Responds to RSVP

As a guest, I want to easily respond to an event invitation and specify how many people will attend, so that the host can plan accordingly.

The guest receives a unique RSVP link, clicks it to access a simple response page showing event details, selects their attendance status (Yes/No/Maybe), specifies the number of guests attending (if responding yes), optionally provides the names of attendees, and submits their response. They receive confirmation that their response was recorded and can update it later if needed.

### Organizer Monitors Responses

As an event organizer, I want to see real-time updates of guest responses and total headcount, so that I can track attendance and plan accordingly.

The organizer accesses their event dashboard, sees a list of all guests with their current status (Pending/Yes/No/Maybe) and number of attendees per invitation, views summary statistics (total invited, total people attending, confirmed, declined), and can identify guests who haven't responded yet for follow-up.

## Spec Scope

1. **Homepage and Navigation** - Landing page with event overview and navigation to key features
2. **Event Management** - Create events with database persistence and basic CRUD operations
3. **Guest Management** - Add, edit, and remove guests with database storage
4. **RSVP Response System** - Guest-facing pages for submitting and updating responses
5. **Dashboard Interface** - Real-time view of all guests and their RSVP status

## Out of Scope

- Multiple simultaneous events (single event focus for MVP)
- Email/SMS notifications (manual sharing of RSVP links)
- Advanced authentication (basic protection only)
- Real-time updates via WebSockets (page refresh for updates)
- Guest groups or seating arrangements
- Dietary preferences or special requirements

## Expected Deliverable

1. Functional event creation and management system accessible at `/admin`
2. Guest RSVP page accessible via unique links at `/rsvp/[token]`
3. Dashboard showing all guests and their responses with manual refresh for updates

## Spec Documentation

- Tasks: @.agent-os/specs/2025-01-15-mvp-core-features/tasks.md
- Technical Specification: @.agent-os/specs/2025-01-15-mvp-core-features/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-01-15-mvp-core-features/sub-specs/api-spec.md
- Database Schema: @.agent-os/specs/2025-01-15-mvp-core-features/sub-specs/database-schema.md
- Tests Specification: @.agent-os/specs/2025-01-15-mvp-core-features/sub-specs/tests.md