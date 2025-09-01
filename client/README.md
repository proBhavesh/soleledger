# SoleLedger - Developer Handover Documentation

## 🚨 Critical Information for Takeover

**Project Status**: Active development with critical issues pending
**Client Communication**: Via WhatsApp/Loom (no meetings currently)
**Primary Contact**: [Client contact details]
**Last Updated**: August 2024

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Tech Stack & Architecture](#tech-stack--architecture)
4. [Environment Setup](#environment-setup)
5. [Database & Migrations](#database--migrations)
6. [Key Features & Implementation](#key-features--implementation)
7. [Third-Party Integrations](#third-party-integrations)
8. [Business Logic](#business-logic)
9. [Current Issues & Priorities](#current-issues--priorities)
10. [Recent Work Completed](#recent-work-completed)
11. [File Structure & Important Files](#file-structure--important-files)
12. [Development Workflow](#development-workflow)
13. [Deployment](#deployment)
14. [Testing Credentials](#testing-credentials)
15. [Contact & Support](#contact--support)

---

## Project Overview

**SoleLedger** is an automated bookkeeping SaaS platform designed for small businesses and accountants. It provides:
- Automated transaction categorization using AI
- Double-entry bookkeeping with journal entries
- Bank account integration via Plaid
- Receipt/invoice processing with Claude AI
- Multi-client management for accountants
- Financial reporting (P&L, Balance Sheet, Cash Flow)
- Subscription billing via Stripe

**Target Market**: Canadian small businesses (all amounts in CAD)
**Business Model**: Freemium with paid tiers at $39 and $59 CAD/month

---

## Quick Start

```bash
# Clone repository
git clone [repository-url]
cd soleledger/client

# Install dependencies (MUST use pnpm)
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in all required environment variables (see Environment Setup section)

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm dlx prisma migrate dev

# Start development server
pnpm dev

# Open http://localhost:3000
```

---

## Tech Stack & Architecture

### Core Technologies
- **Framework**: Next.js 15.3.1 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL (Supabase hosted)
- **ORM**: Prisma 6.7.0
- **Authentication**: NextAuth.js v4 (Google OAuth + Credentials)
- **UI Components**: Shadcn UI (Radix UI + Tailwind CSS)
- **State Management**: React Context + Server Components
- **Package Manager**: pnpm (REQUIRED - do not use npm/yarn)

### External Services
- **Payments**: Stripe (subscriptions)
- **Banking**: Plaid (account aggregation)
- **Storage**: Supabase Storage (S3-compatible)
- **AI Processing**: Claude API (Anthropic)
- **Email**: Resend
- **Hosting**: Vercel (recommended)

### Architecture Pattern
```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js   │────▶│   Prisma     │────▶│  PostgreSQL  │
│  App Router │     │     ORM      │     │  (Supabase)  │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       ▼                                         ▼
┌─────────────┐                          ┌──────────────┐
│Server Actions│                          │   Supabase   │
│   (/lib)    │                          │   Storage    │
└─────────────┘                          └──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              External Services                       │
│  Stripe | Plaid | Claude AI | Resend | Google OAuth │
└──────────────────────────────────────────────────────┘
```

---

## Environment Setup

### Required Environment Variables

```bash
# Database (Supabase)
DATABASE_URL=postgresql://[user]:[password]@[host]:6543/[database]?pgbouncer=true
DIRECT_URL=postgresql://[user]:[password]@[host]:5432/[database]

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[generate with: openssl rand -base64 32]
AUTH_GOOGLE_ID=[from Google Cloud Console]
AUTH_GOOGLE_SECRET=[from Google Cloud Console]

# Stripe (Required for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...  # $39 CAD plan
STRIPE_BUSINESS_PRICE_ID=price_...      # $59 CAD plan
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=[same as above]
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=[same as above]

# Plaid (Banking integration)
PLAID_CLIENT_ID=[from Plaid dashboard]
PLAID_SECRET=[from Plaid dashboard]
PLAID_ENV=sandbox  # Use 'sandbox' for development

# Claude AI (Document processing)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase Storage
STORAGE_ACCESS_KEY_ID=[from Supabase dashboard]
STORAGE_ACCESS_KEY_SECRET=[from Supabase dashboard]
STORAGE_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
STORAGE_REGION=us-east-1
STORAGE_BUCKET_NAME=receipts

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="SoleLedger <noreply@yourdomain.com>"
```

### Setting Up Services

1. **Supabase**:
   - Create project at https://supabase.com
   - Get database URLs from Settings > Database
   - Enable Storage and create 'receipts' bucket
   - Get S3 credentials from Settings > Storage

2. **Stripe**:
   - Create account at https://stripe.com
   - Create products and price IDs for $39 and $59 CAD plans
   - Set up webhook endpoint for `/api/stripe/webhook`

3. **Plaid**:
   - Sign up at https://plaid.com
   - Use sandbox environment for development
   - Configure webhook URL: `[your-domain]/api/plaid/webhook`

4. **Google OAuth**:
   - Create project in Google Cloud Console
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add redirect URIs: `http://localhost:3000/api/auth/callback/google`

5. **Anthropic (Claude)**:
   - Get API key from https://console.anthropic.com

6. **Resend**:
   - Sign up at https://resend.com
   - Verify domain for sending emails

---

## Database & Migrations

### Key Models
- **User**: Authentication and profile
- **Business**: Company information
- **BusinessMember**: Many-to-many relationship for accountants
- **BankAccount**: Connected or manual bank accounts
- **Transaction**: Financial transactions
- **JournalEntry**: Double-entry bookkeeping records
- **Category**: Chart of Accounts
- **Document**: Receipts/invoices
- **ReconciliationStatus**: Transaction-document matching
- **Subscription**: Stripe subscription data

### Database Commands
```bash
# Generate Prisma client
pnpm prisma:generate

# Create migration
pnpm dlx prisma migrate dev --name migration_name

# Apply migrations
pnpm dlx prisma migrate deploy

# Open Prisma Studio (database GUI)
pnpm dlx prisma studio

# Reset database (WARNING: deletes all data)
pnpm dlx prisma migrate reset
```

### Recent Schema Changes (August 2024)
- Added `AuthProvider` enum (CREDENTIALS, GOOGLE)
- Added `authProvider` and `emailVerificationToken` to User model
- Added email verification flow support

---

## Key Features & Implementation

### 1. Authentication System
- **Location**: `/lib/auth`, `/app/api/auth`
- **Features**:
  - Google OAuth
  - Email/password with verification
  - Role-based access (BUSINESS_OWNER, ACCOUNTANT)
  - Session management with NextAuth.js

### 2. Multi-Client Management
- **Location**: `/lib/contexts/business-context.tsx`
- **Features**:
  - Business context switching for accountants
  - Permission levels (FULL_MANAGEMENT only in MVP)
  - Client invitation system

### 3. Bank Integration
- **Location**: `/lib/actions/plaid`, `/lib/plaid`
- **Flow**:
  1. User initiates Plaid Link
  2. Exchange public token for access token
  3. Store encrypted access token
  4. Sync transactions periodically
  5. Create journal entries automatically

### 4. Document Processing
- **Location**: `/lib/ai`, `/lib/storage`
- **Flow**:
  1. Upload to Supabase Storage
  2. Process with Claude AI
  3. Extract vendor, amount, date, tax
  4. Suggest transaction matches
  5. User confirms or manually matches

### 5. Double-Entry Bookkeeping
- **Location**: `/lib/accounting/journal-entry-factory.ts`
- **Implementation**:
  - Every transaction creates balanced journal entries
  - Debits = Credits (always)
  - Chart of Accounts follows standard accounting principles
  - Balance sheet calculations from journal entries

### 6. Transaction Categorization ⚠️ **NEEDS WORK**
- **Location**: `/lib/ai/bank-statement-processor.ts`
- **Current**: Basic keyword matching
- **Needed**: Intelligent vendor-based categorization

### 7. Reconciliation System
- **Location**: `/lib/actions/reconciliation-actions.ts`
- **Features**:
  - Auto-matching with 5% amount tolerance
  - 7-day date tolerance
  - Confidence scoring
  - Manual matching interface

### 8. Reporting
- **Location**: `/lib/actions/report-actions.ts`, `/lib/services/pdf-export-service.ts`
- **Reports**:
  - Profit & Loss Statement
  - Balance Sheet
  - Cash Flow Statement
  - Expense Categories
- **Features**:
  - PDF export with jsPDF
  - Reconciliation status tracking
  - Period comparisons

### 9. Subscription Management
- **Location**: `/lib/stripe`, `/app/api/stripe`
- **Plans**:
  - Free: Limited features
  - Professional ($39 CAD): Growing businesses
  - Business ($59 CAD): Established businesses
- **Webhook handling for status updates**

---

## Third-Party Integrations

### Plaid (Banking)
```typescript
// Initialize link
const { open } = usePlaidLink({
  token: linkToken,
  onSuccess: (public_token) => {
    // Exchange for access token
  }
});

// Sync transactions
await plaidClient.transactionsSync({
  access_token,
  cursor: lastCursor
});
```

### Stripe (Payments)
```typescript
// Create checkout session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price: priceId,
    quantity: 1
  }],
  mode: 'subscription'
});

// Handle webhooks
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

### Claude AI (Document Processing)
```typescript
// Process receipt
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    messages: [/* ... */]
  })
});
```

### Supabase Storage
```typescript
// Upload file
const { signedUrl } = await getSignedUploadUrl(
  fileName,
  'receipts'
);

// Download file
const url = await getPublicUrl(filePath);
```

---

## Business Logic

### Double-Entry Bookkeeping Rules
1. **Assets** (Debit ↑, Credit ↓)
   - Bank accounts, equipment, inventory
2. **Liabilities** (Credit ↑, Debit ↓)
   - Credit cards, loans, accounts payable
3. **Equity** (Credit ↑, Debit ↓)
   - Owner's equity, retained earnings
4. **Income** (Credit ↑, Debit ↓)
   - Sales revenue, service income
5. **Expenses** (Debit ↑, Credit ↓)
   - Operating expenses, cost of goods sold

### Transaction Flow
```
User Action → Transaction Created → Journal Entries Generated
                                  → Category Assigned
                                  → Balance Updated
                                  → Reports Affected
```

### Balance Calculation
- **Plaid Accounts**: Use API balance (authoritative)
- **Manual Accounts**: Calculate from journal entries
- **Service**: `/lib/services/bank-balance-service.ts`

---

## Current Issues & Priorities

### 🔴 CRITICAL (Must Fix)

#### 1. Transaction Categorization (HIGHEST PRIORITY)
**Problem**: Almost everything categorized as "Miscellaneous Expense"
**Location**: `/lib/ai/bank-statement-processor.ts`, `/components/dashboard/transactions`
**Required Fix**:
```typescript
// Need vendor database like:
const vendorCategories = {
  'AMAZON': 'Online Shopping',
  'UBER': 'Transportation',
  'STARBUCKS': 'Travel & Meals',
  // etc...
};

// Add learning from user corrections
// Add inline category creation button
```
**Goal**: 80% auto-categorization accuracy

#### 2. Reconciliation Page Issues
**Problem**: Wrong transaction counts, UI cutoff
**Location**: `/app/(dashboard)/dashboard/reconciliation/page.tsx`
**Issues**:
- Showing 76 vs 113 actual transactions
- Bank imports appearing in reconciliation queue
- No document matching from transaction view

### 🟡 IMPORTANT (Should Fix)

#### 3. Receipt Matching UI
- Three-dot menu non-functional
- Can't download receipts
- Manual matching needs improvement

#### 4. UI/UX Polish
- Add visual indicators for read-only access
- Fix any remaining permission UI issues
- Improve error messages

### 🟢 COMPLETED (Recent Work)

✅ Bank balance calculation for manual accounts
✅ Balance sheet with retained earnings flow
✅ Dashboard cash flow display
✅ PDF export for all reports
✅ Receipt matching tolerances (5% amount, 7 days)
✅ Invitation system with OAuth support
✅ CSV import temporarily disabled (PDF only)
✅ Email verification flow

---

## File Structure & Important Files

### Critical Files to Understand

```
/app
├── (auth)                    # Public auth pages
│   ├── login/page.tsx       # Login with OAuth/credentials
│   └── register/page.tsx    # New user registration
├── (dashboard)              # Protected dashboard
│   └── dashboard/
│       ├── page.tsx         # Main dashboard
│       ├── transactions/    # Transaction management
│       ├── bank-accounts/   # Banking integration
│       ├── reconciliation/  # Document matching
│       ├── reports/         # Financial reports
│       └── settings/        # User/business settings
└── api/                     # API routes
    ├── auth/               # NextAuth endpoints
    ├── stripe/webhook/     # Stripe webhooks
    ├── plaid/webhook/      # Plaid webhooks
    └── invitations/        # Invitation handling

/lib
├── actions/                # Server actions (mutations)
│   ├── transaction-actions.ts
│   ├── reconciliation-actions.ts
│   └── plaid/             # Banking actions
├── ai/                    # AI processing
│   ├── receipt-processor.ts
│   └── bank-statement-processor.ts
├── accounting/            # Bookkeeping logic
│   └── journal-entry-factory.ts
├── services/              # Business services
│   ├── bank-balance-service.ts    # ⭐ Balance calculations
│   └── pdf-export-service.ts      # Report exports
├── contexts/              # React contexts
│   └── business-context.tsx       # ⭐ Multi-client switching
└── types/                 # TypeScript definitions

/prisma
└── schema.prisma          # ⭐ Database schema

/components
├── dashboard/             # Dashboard components
│   ├── transactions/      # Transaction UI
│   ├── banking/          # Bank account UI
│   └── reconciliation/   # Matching UI
└── ui/                   # Shadcn components
```

### Configuration Files
- `.env` - Environment variables (DO NOT COMMIT)
- `.env.example` - Environment template
- `CLAUDE.md` - AI assistant instructions
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS
- `prisma/schema.prisma` - Database schema

---

## Development Workflow

### Code Style & Conventions
1. **Always use pnpm** (never npm/yarn)
2. **Never create Shadcn components manually** - use CLI:
   ```bash
   pnpm dlx shadcn@latest add [component]
   ```
3. **Server Components by default** - minimize 'use client'
4. **Server Actions for mutations** - in `/lib/actions`
5. **Functional/declarative patterns**
6. **Event handlers** prefixed with "handle"
7. **Directories** use lowercase-with-dashes
8. **Currency** always in CAD

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/description

# Make changes and test
pnpm dev

# Run linting
pnpm lint

# Build to check for errors
pnpm build

# Commit (don't mention AI/Claude)
git add .
git commit -m "feat: add transaction categorization"

# Push and create PR
git push origin feature/description
```

### Testing Locally
1. Use Plaid sandbox mode
2. Test credit cards: 4242 4242 4242 4242
3. Create test businesses and transactions
4. Use Prisma Studio to inspect data

---

## Deployment

### Vercel Deployment (Recommended)
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy command: `pnpm build`
4. Install command: `pnpm install`
5. Root directory: `client`

### Manual Deployment
```bash
# Build production
pnpm build

# Run production
pnpm start
```

### Database Migrations in Production
```bash
# Apply pending migrations
pnpm dlx prisma migrate deploy

# Generate client
pnpm prisma:generate
```

---

## Testing Credentials

### Development Users
```
Email: test@example.com
Password: Test123!

Role: BUSINESS_OWNER or ACCOUNTANT
```

### Plaid Sandbox
```
Username: user_good
Password: pass_good
```

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
```

---

## Contact & Support

### Immediate Issues
- Check `/todo.md` for priority list
- Review recent commits for context
- Test in development before deploying

### Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Plaid Docs](https://plaid.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Shadcn UI](https://ui.shadcn.com)

### Project Files
- Original requirements: `/CLAUDE.md`
- Todo list: `/todo.md`
- Category standards: `/docs/CATEGORY_STANDARDIZATION.md`
- Billing setup: `/docs/BILLING_SETUP.md`

---

## Quick Fixes Needed

### Fix #1: Transaction Categorization
```typescript
// In /lib/ai/bank-statement-processor.ts
// Add after line 174:

const VENDOR_CATEGORIES = {
  // Common vendors
  'AMAZON': 'Online Shopping',
  'UBER': 'Transportation',
  'LYFT': 'Transportation',
  'WALMART': 'Supplies',
  'STARBUCKS': 'Travel & Meals',
  'TIM HORTONS': 'Travel & Meals',
  // Add more...
};

function categorizeByVendor(description: string): string {
  const upperDesc = description.toUpperCase();
  for (const [vendor, category] of Object.entries(VENDOR_CATEGORIES)) {
    if (upperDesc.includes(vendor)) {
      return category;
    }
  }
  return 'Miscellaneous Expense';
}
```

### Fix #2: Add Category Creation Button
```typescript
// In /components/dashboard/transactions/transaction-list.tsx
// Add button to create category inline:

<Button
  size="sm"
  variant="ghost"
  onClick={() => openCreateCategoryDialog(transaction)}
>
  <Plus className="h-4 w-4" />
</Button>
```

### Fix #3: Reconciliation Count Issue
```typescript
// In /lib/actions/reconciliation-actions.ts
// Check the transaction filtering logic around line 52-64
// Ensure bank imports are properly excluded
```

---

## Final Notes

This project is a complex financial system with many moving parts. The core bookkeeping logic is solid, but the user experience needs polish, especially around transaction categorization.

**Most Important**: 
1. Fix transaction categorization FIRST - it's the heart of the system
2. Test thoroughly with real bank data
3. Keep the double-entry bookkeeping balanced
4. Maintain data integrity above all else

The client expects the system to "just work" for bookkeeping, so accuracy is paramount.

Good luck with the handover! 🚀