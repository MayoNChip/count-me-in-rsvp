# Technical Stack

> Last Updated: 2025-08-15
> Version: 1.0.0

## Core Technologies

### Application Framework
- **Framework:** Next.js
- **Version:** 15.4.6
- **Language:** TypeScript 5+

### Database
- **Primary:** Supabase (PostgreSQL)
- **Version:** Latest
- **ORM:** Supabase Client with Server Actions

## Frontend Stack

### JavaScript Framework
- **Framework:** React
- **Version:** 19.1.0
- **Build Tool:** Next.js with Turbopack

### Import Strategy
- **Strategy:** Node.js modules
- **Package Manager:** pnpm
- **Node Version:** 20+

### CSS Framework
- **Framework:** TailwindCSS
- **Version:** 4.0+
- **PostCSS:** Yes (@tailwindcss/postcss)

### UI Components
- **Library:** shadcn/ui
- **Version:** Latest
- **Installation:** Via CLI (npx shadcn@latest)

### State Management
- **Library:** TanStack Query
- **Version:** v5 (Latest)
- **Purpose:** Server state management and caching

## Assets & Media

### Fonts
- **Provider:** Next.js Font Optimization
- **Loading Strategy:** Self-hosted with next/font

### Icons
- **Library:** Lucide React
- **Implementation:** React components

## Infrastructure

### Application Hosting
- **Platform:** Vercel
- **Service:** Edge Functions
- **Region:** Auto (Global Edge Network)

### Database Hosting
- **Provider:** Supabase
- **Service:** Managed PostgreSQL
- **Backups:** Automated daily

### Asset Storage
- **Provider:** Vercel Edge Network
- **CDN:** Built-in CDN
- **Access:** Public for static assets

## Deployment

### CI/CD Pipeline
- **Platform:** Vercel (Automatic)
- **Trigger:** Push to main branch
- **Tests:** Run before deployment

### Environments
- **Production:** main branch
- **Preview:** Pull requests
- **Development:** Local with pnpm dev

## Code Repository
- **URL:** To be determined (will be added when repository is created)