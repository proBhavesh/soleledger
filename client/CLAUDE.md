# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoleLedger is an automated bookkeeping SaaS platform built with Next.js 15 (App Router), designed to simplify financial management for small businesses and accountants. The application supports multi-client management, integrates with Plaid for banking, Stripe for payments, uses AI (Claude) for document processing, and implements proper double-entry bookkeeping.

## Development Commands

```bash
# Install dependencies (use pnpm)
pnpm install

# Development
pnpm dev              # Start development server on http://localhost:3000

# Database
pnpm prisma:generate  # Generate Prisma client
pnpm dlx prisma migrate dev  # Run database migrations
pnpm dlx prisma studio       # Open Prisma Studio

# Build & Production
pnpm build           # Build for production (includes prisma generate)
pnpm start           # Start production server

# Code Quality
pnpm lint            # Run Next.js linter

# UI Components (always use CLI, never create manually)
pnpm dlx shadcn@latest add [component-name]
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.3.1 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Supabase PostgreSQL with Prisma ORM
- **Storage**: Supabase Storage (S3-compatible) for documents
- **Authentication**: NextAuth.js with Google OAuth & credentials
- **Payments**: Stripe subscriptions
- **Banking**: Plaid API integration
- **Document AI**: Claude API for receipt/invoice processing
- **Bookkeeping**: Double-entry bookkeeping with journal entries
- **UI**: Shadcn UI (Radix UI + Tailwind CSS)
- **Currency**: CAD (Canadian Dollar) throughout

### Key Architectural Patterns

1. **Server Components First**: Minimize 'use client' directives. Use RSC for data fetching and initial renders.

2. **Server Actions**: All mutations use server actions in `/lib/actions/`. Pattern:
   ```typescript
   export async function actionName(data: z.infer<typeof schema>) {
     const session = await auth();
     if (!session?.user?.id) return { success: false, error: "Unauthorized" };
     // Implementation
   }
   ```

3. **Database Access**: 
   - Always import Prisma client from `@/lib/db` (e.g., `import { db } from "@/lib/db"`)
   - For Prisma types only, import from `/generated/prisma/` (e.g., `import type { Prisma } from "@/generated/prisma"`)
   - Never import Prisma from `@prisma/client` directly

4. **Authentication Flow**: 
   - Check session with `auth()` helper
   - User → Business relationship (many-to-many via BusinessMember)
   - Role-based access (BUSINESS_OWNER, ACCOUNTANT)
   - Business context switching for accountants
   - Granular permissions (VIEW_ONLY, FULL_MANAGEMENT, FINANCIAL_ONLY, DOCUMENTS_ONLY)

5. **File Organization**:
   ```
   /app/(auth)           # Auth pages (login, register)
   /app/(dashboard)      # Protected dashboard routes  
   /app/api             # API routes (auth, webhooks)
   /components          # Reusable components
   /lib/actions         # Server actions
   /lib/types          # TypeScript types
   /lib/contexts        # React contexts (business context)
   /lib/storage         # Supabase storage utilities
   ```

## Critical Business Logic

### Double-Entry Bookkeeping
- **Journal Entries**: Every transaction creates balanced debit/credit entries
- **Chart of Accounts**: Structured account hierarchy (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
- **Balance Sheet**: Always balances due to proper double-entry
- **Transaction Types**: Simple (INCOME/EXPENSE/TRANSFER) or custom journal entries

### Multi-Client Management
- **Accountants**: Can manage multiple client businesses
- **Business Context**: Switch between client businesses via BusinessSelector
- **Access Levels**: Granular permissions per client relationship
- **Client Invitations**: Email-based invitation system

### Document Processing Flow
1. User uploads receipt/invoice → Supabase Storage
2. AI extracts data (vendor, amount, date, tax)
3. System suggests transaction matches
4. User confirms or manually matches
5. Reconciliation status updated

### Transaction Reconciliation
- **Auto-matching**: Based on amount (±5% tolerance) and date (±7 days)
- **Confidence scoring**: 0-1 scale for match quality
- **Manual matching**: Full UI for searching and linking documents
- **Status tracking**: UNMATCHED → MATCHED/MANUALLY_MATCHED

### Subscription Model
- Trial → Basic ($19) → Professional ($49) → Enterprise (custom)
- Stripe webhooks handle status updates
- Features gated by subscription level

## Environment Variables Required

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=             # Supabase PostgreSQL pooler connection
DIRECT_URL=              # Supabase direct PostgreSQL connection

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# External Services
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=               # sandbox/development/production
ANTHROPIC_API_KEY=       # For Claude AI

# Supabase Storage (S3-compatible)
STORAGE_ACCESS_KEY_ID=        # S3-compatible access key
STORAGE_ACCESS_KEY_SECRET=    # S3-compatible secret key
STORAGE_ENDPOINT=             # Supabase storage S3 endpoint
STORAGE_REGION=               # Storage region
STORAGE_BUCKET_NAME=          # Storage bucket name (e.g., "receipts")
```

## Development Guidelines

### From .cursorrules:
- **Never create shadcn components manually** - always use CLI: `pnpm dlx shadcn@latest add`
- **Always use pnpm** as package manager
- Use functional/declarative patterns
- Prefix event handlers with "handle"
- Use lowercase-with-dashes for directories
- Prefer interfaces over types
- Avoid enums; use const maps

### Async APIs in Next.js 15:
```typescript
// Always await these
const cookieStore = await cookies();
const headersList = await headers();
const params = await props.params;
const searchParams = await props.searchParams;
```

### State Management
- URL state with 'nuqs' for filters/pagination
- Minimize client state
- Server state through React Query or SWR
- Form state with react-hook-form + zod

### Error Handling Pattern
```typescript
try {
  // Operation
  return { success: true, data };
} catch (error) {
  console.error("Context:", error);
  return { success: false, error: "User-friendly message" };
}
```

## Common Tasks

### Adding a New Feature
1. Define database schema in `prisma/schema.prisma`
2. Run migrations: `pnpm dlx prisma migrate dev`
3. Create server actions in `/lib/actions/`
4. Build UI components (install from shadcn if needed)
5. Add to navigation if needed

### Modifying Reconciliation Logic
- Core logic in `/lib/actions/reconciliation-actions.ts`
- Matching algorithm considers amount, date, vendor
- UI components in `/components/dashboard/reconciliation/`

### Working with Double-Entry Bookkeeping
- Transaction creation in `/lib/actions/transaction-journal-actions.ts`
- Journal entries automatically created for each transaction
- Balance sheet generation in `/lib/actions/report-actions.ts`
- Chart of accounts management in `/lib/actions/chart-of-accounts-actions.ts`

### Working with Multi-Client System
- Business context provider in `/lib/contexts/business-context.tsx`
- Client management in `/lib/actions/client-management-actions.ts`
- Member management in `/lib/actions/member-management-actions.ts`
- Business switching via BusinessSelector component

### Working with Plaid
- Client initialized in `/lib/plaid/client.ts`
- Webhook handler at `/app/api/plaid/webhook/route.ts`
- Actions organized in `/lib/actions/plaid/`

### Working with Supabase Storage
- Storage utilities in `/lib/storage/supabase-storage.ts`
- S3-compatible API for file operations
- Presigned URLs for secure uploads

## Testing Approach
- Manual testing in development
- Type safety through TypeScript
- Zod schemas for runtime validation
- Error boundaries for graceful failures

## Deployment Notes
- Outputs standalone Next.js build
- Prisma generates at build time
- Environment-specific variables in Vercel/deployment platform
- Database migrations run separately