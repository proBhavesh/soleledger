# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoleLedger is an automated bookkeeping SaaS platform built with Next.js 15 (App Router), designed to simplify financial management for small businesses and sole proprietors. The application integrates with Plaid for banking, Stripe for payments, and uses AI (Claude) for document processing.

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
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth & credentials
- **Payments**: Stripe subscriptions
- **Banking**: Plaid API integration
- **Document AI**: Claude API for receipt/invoice processing
- **Storage**: AWS S3 for documents
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

3. **Database Access**: Always through Prisma client at `@/lib/db`. Generated types in `/generated/prisma/`.

4. **Authentication Flow**: 
   - Check session with `auth()` helper
   - User → Business relationship (one-to-many)
   - Role-based access (BUSINESS_OWNER, ACCOUNTANT)

5. **File Organization**:
   ```
   /app/(auth)           # Auth pages (login, register)
   /app/(dashboard)      # Protected dashboard routes
   /app/api             # API routes (auth, webhooks)
   /components          # Reusable components
   /lib/actions         # Server actions
   /lib/types          # TypeScript types
   ```

## Critical Business Logic

### Document Processing Flow
1. User uploads receipt/invoice → S3 storage
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
# Database
DATABASE_URL=             # PostgreSQL connection
DIRECT_URL=              # Direct PostgreSQL connection

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

# AWS (Document Storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET_NAME=
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

### Working with Plaid
- Client initialized in `/lib/plaid/client.ts`
- Webhook handler at `/app/api/plaid/webhook/route.ts`
- Actions organized in `/lib/actions/plaid/`

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