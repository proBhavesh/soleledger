/*
  Warnings:

  - The values [TRIAL] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `trialEndsAt` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE', 'FREE');
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "SubscriptionStatus_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "BankAccount" ALTER COLUMN "currency" SET DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "trialEndsAt",
ADD COLUMN     "bankAccountLimit" INTEGER,
ADD COLUMN     "documentUploadLimit" INTEGER,
ADD COLUMN     "transactionLimit" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'FREE',
ALTER COLUMN "currency" SET DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'CAD';

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "documentUploadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Usage_businessId_idx" ON "Usage"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_businessId_month_key" ON "Usage"("businessId", "month");

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
