# SoleLedger - Quick Reference Guide

## 🚀 Daily Development Commands

```bash
# Start development
pnpm dev

# Check for TypeScript errors
pnpm build

# Run linter
pnpm lint

# Open database GUI
pnpm dlx prisma studio

# View logs
tail -f .next/server/console.log
```

## 🔧 Common Tasks

### Adding a New Feature
```bash
# 1. Update schema if needed
# Edit prisma/schema.prisma

# 2. Create migration
pnpm dlx prisma migrate dev --name feature_name

# 3. Create server action
# Create file in /lib/actions/feature-actions.ts

# 4. Add UI component
pnpm dlx shadcn@latest add dialog  # Example

# 5. Create page/component
# Add to /app or /components
```

### Testing a Transaction Flow
```javascript
// 1. Create test transaction
const transaction = await createTransaction({
  amount: 100.00,
  type: 'EXPENSE',
  description: 'Test Purchase',
  date: new Date(),
  businessId: 'xxx'
});

// 2. Check journal entries created
// Open Prisma Studio and check JournalEntry table

// 3. Verify balance updated
// Check BankAccount balance
```

### Debugging Plaid Issues
```bash
# Check Plaid webhook logs
grep "plaid" .next/server/console.log

# Test Plaid connection
curl -X POST https://sandbox.plaid.com/accounts/get \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "secret": "YOUR_SECRET",
    "access_token": "access-sandbox-xxx"
  }'
```

### Debugging Stripe Issues
```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

## 🎯 Quick Fixes

### Fix: Transaction Not Categorizing
```typescript
// Check /lib/ai/bank-statement-processor.ts
// Add vendor to VENDOR_CATEGORIES map
// Line ~174
```

### Fix: Balance Not Updating
```typescript
// Check /lib/services/bank-balance-service.ts
// Verify journal entries exist for transaction
// Manual accounts calculate from journal entries
```

### Fix: Reconciliation Not Matching
```typescript
// Check /lib/actions/reconciliation-actions.ts
// Verify tolerances: 5% amount, 7 days date
// Line ~340
```

### Fix: Report Not Balancing
```typescript
// Check /lib/actions/report-actions.ts
// Ensure retained earnings includes net income
// Line ~577
```

## 📁 Key File Locations

| Feature | Location |
|---------|----------|
| Transaction Categorization | `/lib/ai/bank-statement-processor.ts` |
| Balance Calculation | `/lib/services/bank-balance-service.ts` |
| Journal Entries | `/lib/accounting/journal-entry-factory.ts` |
| Reconciliation | `/lib/actions/reconciliation-actions.ts` |
| Reports | `/lib/actions/report-actions.ts` |
| PDF Export | `/lib/services/pdf-export-service.ts` |
| Plaid Integration | `/lib/actions/plaid/` |
| Stripe Integration | `/app/api/stripe/` |
| Business Context | `/lib/contexts/business-context.tsx` |
| Authentication | `/lib/auth/index.ts` |

## 🐛 Common Errors & Solutions

### Error: "No business found"
```typescript
// User doesn't have a business
// Check BusinessMember table
// Verify business context
```

### Error: "Unauthorized"
```typescript
// Session expired or missing
// Check auth() in server action
// Verify NEXTAUTH_SECRET
```

### Error: "Transaction amount must be positive"
```typescript
// Amounts stored as positive
// Type (INCOME/EXPENSE) determines sign
```

### Error: "Journal entries don't balance"
```typescript
// Debits must equal credits
// Check journal-entry-factory.ts
// Verify account types
```

## 💡 Development Tips

1. **Always use pnpm** - npm/yarn will break
2. **Check Prisma Studio** for data issues
3. **Server Components first** - minimize client components
4. **Test with real data** - use Plaid sandbox
5. **Currency is CAD** - all amounts in Canadian dollars
6. **Double-entry must balance** - debits = credits always

## 🔍 Database Queries

### Get all transactions for a business
```sql
SELECT * FROM "Transaction" 
WHERE "businessId" = 'xxx' 
ORDER BY date DESC;
```

### Check journal entry balance
```sql
SELECT 
  "transactionId",
  SUM("debitAmount") as debits,
  SUM("creditAmount") as credits
FROM "JournalEntry"
GROUP BY "transactionId"
HAVING SUM("debitAmount") != SUM("creditAmount");
```

### Find unmatched transactions
```sql
SELECT t.* FROM "Transaction" t
LEFT JOIN "ReconciliationStatus" r ON t.id = r."transactionId"
WHERE r.id IS NULL OR r.status = 'UNMATCHED';
```

## 📊 Business Rules

### Chart of Accounts
- **1000-1999**: Assets
- **2000-2999**: Liabilities  
- **3000-3999**: Equity
- **4000-4999**: Income
- **5000-5999**: Expenses

### Transaction Types
- **INCOME**: Money in (credit to income account)
- **EXPENSE**: Money out (debit to expense account)
- **TRANSFER**: Between accounts (ignored in imports)

### Reconciliation Status
- **UNMATCHED**: No document linked
- **MATCHED**: Auto-matched with document
- **MANUALLY_MATCHED**: User confirmed match
- **PENDING_REVIEW**: Needs user verification

## 🚨 Priority Issues

1. **Transaction Categorization** - 80% accuracy goal not met
2. **Reconciliation Counts** - Showing wrong numbers
3. **Receipt Download** - Not implemented
4. **Category Creation** - No inline button

## 📞 Support Contacts

- **Database Issues**: Check Supabase dashboard
- **Payment Issues**: Stripe dashboard logs
- **Banking Issues**: Plaid dashboard logs
- **AI Issues**: Claude API console
- **Email Issues**: Resend dashboard

## 🎬 Quick Start Video Scripts

### Test Transaction Flow
1. Create manual bank account
2. Import bank statement PDF
3. Check transactions created
4. Verify journal entries
5. Check balance updated
6. Generate P&L report
7. Generate Balance Sheet
8. Verify it balances

### Test Reconciliation
1. Upload receipt
2. Go to reconciliation page
3. Click auto-match
4. Verify matches found
5. Manually match remaining
6. Check reconciliation report

---

Remember: **Data integrity > Features**. Never compromise bookkeeping accuracy for speed.