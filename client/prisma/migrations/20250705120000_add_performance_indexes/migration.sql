-- Add indexes for faster transaction queries
CREATE INDEX IF NOT EXISTS "Transaction_businessId_externalId_idx" ON "Transaction"("businessId", "externalId");
CREATE INDEX IF NOT EXISTS "Transaction_businessId_date_idx" ON "Transaction"("businessId", "date");
CREATE INDEX IF NOT EXISTS "Transaction_bankAccountId_date_idx" ON "Transaction"("bankAccountId", "date");

-- Add indexes for category lookups
CREATE INDEX IF NOT EXISTS "Category_businessId_accountType_name_idx" ON "Category"("businessId", "accountType", "name");
CREATE INDEX IF NOT EXISTS "Category_businessId_accountCode_idx" ON "Category"("businessId", "accountCode");

-- Add index for bank account lookups
CREATE INDEX IF NOT EXISTS "BankAccount_plaidAccessToken_idx" ON "BankAccount"("plaidAccessToken");
CREATE INDEX IF NOT EXISTS "BankAccount_businessId_userId_idx" ON "BankAccount"("businessId", "userId");