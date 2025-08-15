# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-15-mvp-core-features/spec.md

> Created: 2025-01-15
> Version: 1.0.0

## Technical Requirements

- Next.js 15 App Router for all pages and routing
- Server Components by default, Client Components only where needed (forms, interactivity)
- Supabase PostgreSQL database with Drizzle ORM
- Drizzle Kit for database migrations and schema management
- TanStack Query for server state management and caching
- Server Actions for form submissions and mutations
- shadcn/ui components for consistent UI
- Tailwind CSS v4 for styling with CSS variables
- TypeScript for type safety throughout
- Responsive design for mobile and desktop

## UI/UX Specifications

- Clean, modern design with wedding-appropriate aesthetics
- Mobile-first responsive layout
- Loading states for all async operations
- Error boundaries and user-friendly error messages
- Form validation with immediate feedback
- Accessible components following WCAG guidelines
- Toast notifications for user actions
- Optimistic UI updates where appropriate

## Approach Options

**Option A: Client-side React with API Routes**
- Pros: Familiar pattern, easy state management, good for real-time
- Cons: More client-side JavaScript, slower initial load, SEO challenges

**Option B: Server Components with Server Actions** (Selected)
- Pros: Better performance, less client JS, built-in security, simpler architecture
- Cons: Learning curve for Server Components, careful state management needed

**Rationale:** Server Components with Server Actions aligns with Next.js 15 best practices, provides better performance, and simplifies the architecture by keeping most logic server-side. This approach also provides better SEO and security out of the box.

## Component Architecture

### Layout Structure
- `app/layout.tsx` - Root layout with Supabase provider
- `app/(public)/layout.tsx` - Public pages layout
- `app/(admin)/layout.tsx` - Admin pages with auth protection

### Page Structure
- `/` - Homepage (Server Component)
- `/admin` - Event dashboard (Server Component with Client Components for interactivity)
- `/admin/event/new` - Create event form (Client Component for form)
- `/admin/guests` - Guest management (Server Component with Client table)
- `/rsvp/[token]` - Guest RSVP page (Server Component with Client form)
- `/rsvp/confirm` - RSVP confirmation (Server Component)

## External Dependencies

- **drizzle-orm** - TypeScript ORM for PostgreSQL
  - **Justification:** Type-safe database operations with excellent TypeScript integration

- **drizzle-kit** - Migration tool and schema management
  - **Justification:** Handles database migrations, schema changes, and introspection

- **postgres** - PostgreSQL client for Node.js
  - **Justification:** Direct database connection for use with Drizzle ORM

- **@tanstack/react-query** - Server state management
  - **Justification:** Robust caching, optimistic updates, and background refetching

- **@radix-ui/\*** (via shadcn/ui) - Headless UI components
  - **Justification:** Accessible, unstyled components that work with our design system

- **react-hook-form** - Form management
  - **Justification:** Performance-focused form library with excellent validation

- **zod** - Schema validation
  - **Justification:** TypeScript-first validation that integrates with react-hook-form

- **lucide-react** - Icon library
  - **Justification:** Modern, customizable icons that match our design aesthetic

- **date-fns** - Date manipulation
  - **Justification:** Lightweight, modular date utility library

- **nanoid** - Unique ID generation
  - **Justification:** Small, secure, URL-safe unique ID generator for guest tokens

## Performance Considerations

- Use Server Components by default for better performance
- Implement proper caching strategies with TanStack Query
- Lazy load Client Components where possible
- Optimize images with Next.js Image component
- Use Suspense boundaries for progressive loading
- Implement proper error boundaries
- Use connection pooling for database queries
- Cache database queries appropriately with TanStack Query

## Security Considerations

- Validate all inputs on the server side with Zod schemas
- Implement database-level constraints and validation
- Sanitize user inputs to prevent XSS attacks
- Generate secure, unique tokens for RSVP links using nanoid
- Implement rate limiting on Server Actions and API endpoints
- Use environment variables for database credentials and secrets
- Protect admin routes with authentication middleware
- Use prepared statements via Drizzle to prevent SQL injection