# Billing Setup Guide

This guide explains how to set up the billing system and test usage limits.

## Stripe Setup

### 1. Create Stripe Products

You need to create two products in your Stripe dashboard:

1. **Professional Plan**
   - Name: Professional
   - Price: $19.00 CAD/month
   - Product ID: Save this for your environment variables

2. **Business Plan**
   - Name: Business
   - Price: $49.00 CAD/month
   - Product ID: Save this for your environment variables

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY

# Stripe Price IDs (from the products you created)
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_XXXXXXXXXXXXX
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_XXXXXXXXXXXXX
```

### 3. Webhook Configuration

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

## Testing Usage Limits

### 1. Test Transaction Limits

**Free Plan (100 transactions/month):**
```bash
# Connect to your database
pnpm dlx prisma studio

# Find a business with free plan
# Note the businessId

# Create 100 test transactions quickly
# The 101st transaction should fail
```

**Professional Plan (1,000 transactions/month):**
- Upgrade a test account to Professional
- Import a large bank statement with 1000+ transactions
- Should stop at 1,000 transactions

### 2. Test Bank Account Limits

**Free Plan (1 bank account):**
1. Create a free account
2. Connect one bank account via Plaid
3. Try to connect a second account - should fail

**Professional Plan (5 bank accounts):**
1. Upgrade to Professional
2. Connect 5 bank accounts
3. Try to connect a 6th - should fail

### 3. Test Document Upload Limits

**Free Plan (10 documents/month):**
1. Upload 10 receipts or bank statements
2. 11th upload should fail with limit message

**Professional Plan (100 documents/month):**
1. Upgrade to Professional
2. Upload documents until you hit the 100 limit

### 4. Test Usage Tracking UI

1. Go to Dashboard → Overview
2. Check the Usage Tracker component shows:
   - Current usage for each limit
   - Progress bars
   - Warning badges when near limits
   - "Upgrade Plan" button when limits approached

3. Go to Settings → Billing
2. Verify usage is shown at the top

### 5. Test Upgrade Flow

1. Start with Free plan
2. Reach a limit (e.g., add 100 transactions)
3. Click "Upgrade Plan"
4. Should redirect to Stripe checkout
5. Complete payment
6. Verify:
   - Subscription updated in database
   - Limits increased
   - Can now add more items

### 6. Test Downgrade Flow

1. Have an active paid subscription
2. Go to Settings → Billing
3. Click "Cancel Plan" in Danger Zone
4. Verify:
   - Stripe subscription cancelled
   - Account downgraded to Free plan
   - Limits enforced immediately

## Database Queries for Testing

### Reset Monthly Usage
```sql
-- Reset usage for testing (run at start of month)
UPDATE "Usage" 
SET "transactionCount" = 0, "documentUploadCount" = 0
WHERE "businessId" = 'YOUR_BUSINESS_ID' 
AND "month" = DATE_TRUNC('month', CURRENT_DATE);
```

### Simulate High Usage
```sql
-- Set usage close to limits for testing warnings
UPDATE "Usage" 
SET "transactionCount" = 95, "documentUploadCount" = 9
WHERE "businessId" = 'YOUR_BUSINESS_ID' 
AND "month" = DATE_TRUNC('month', CURRENT_DATE);
```

### Check Current Usage
```sql
-- View current usage for a business
SELECT * FROM "Usage" 
WHERE "businessId" = 'YOUR_BUSINESS_ID' 
AND "month" = DATE_TRUNC('month', CURRENT_DATE);
```

## Common Issues

### Usage Not Tracking
- Ensure `Usage` table exists (run migrations)
- Check that usage tracking functions are imported
- Verify businessId is passed correctly

### Limits Not Enforced
- Check subscription plan in database
- Verify subscription status is "ACTIVE"
- Ensure usage checks are before create operations

### Stripe Webhooks Not Working
- Verify webhook secret is correct
- Check webhook endpoint URL
- Use Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

## Testing Checklist

- [ ] Free plan limits work (100 tx, 1 bank, 10 docs)
- [ ] Professional plan limits work (1k tx, 5 banks, 100 docs)
- [ ] Business plan has unlimited access
- [ ] Usage tracker shows current usage
- [ ] Progress bars and warnings appear correctly
- [ ] Upgrade flow redirects to Stripe
- [ ] Successful payment updates subscription
- [ ] Downgrade/cancel works properly
- [ ] Monthly usage resets on the 1st
- [ ] Error messages are user-friendly