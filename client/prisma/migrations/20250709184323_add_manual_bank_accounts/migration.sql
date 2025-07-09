/*
  Warnings:

  - Made the column `balance` on table `BankAccount` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LINE_OF_CREDIT', 'LOAN');

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "accountType" "BankAccountType" NOT NULL DEFAULT 'CHECKING',
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastManualUpdate" TIMESTAMP(3),
ALTER COLUMN "balance" SET NOT NULL,
ALTER COLUMN "balance" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "BankAccount_isManual_idx" ON "BankAccount"("isManual");
