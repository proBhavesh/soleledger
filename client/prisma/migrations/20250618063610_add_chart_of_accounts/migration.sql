/*
  Warnings:

  - You are about to drop the column `type` on the `Category` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[businessId,accountCode]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountCode` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountType` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- Step 1: Add new columns as optional first
ALTER TABLE "Category" 
ADD COLUMN "accountCode" TEXT,
ADD COLUMN "accountType" "AccountType",
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER;

-- Step 2: Populate accountType based on existing type column
UPDATE "Category" SET "accountType" = 
  CASE 
    WHEN "type" = 'INCOME' THEN 'INCOME'::"AccountType"
    WHEN "type" = 'EXPENSE' THEN 'EXPENSE'::"AccountType"
    WHEN "type" = 'TRANSFER' THEN 'EXPENSE'::"AccountType" -- Default transfers to expense
    ELSE 'EXPENSE'::"AccountType" -- Default fallback
  END;

-- Step 3: Generate unique account codes for existing categories
-- Use a sequence starting from 9000 for existing categories to avoid conflicts with standard chart
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 9000;
BEGIN
    FOR rec IN SELECT id FROM "Category" WHERE "accountCode" IS NULL ORDER BY "createdAt" LOOP
        UPDATE "Category" SET "accountCode" = counter::TEXT WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Step 4: Now make the columns required
ALTER TABLE "Category" 
ALTER COLUMN "accountCode" SET NOT NULL,
ALTER COLUMN "accountType" SET NOT NULL;

-- Step 5: Drop the old type column
ALTER TABLE "Category" DROP COLUMN "type";

-- Step 6: Create indexes
CREATE INDEX "Category_businessId_accountType_idx" ON "Category"("businessId", "accountType");
CREATE INDEX "Category_businessId_sortOrder_idx" ON "Category"("businessId", "sortOrder");
CREATE UNIQUE INDEX "Category_businessId_accountCode_key" ON "Category"("businessId", "accountCode");
