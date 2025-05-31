/*
  Warnings:

  - A unique constraint covering the columns `[userId,planId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'CONFIRMED', 'REJECTED', 'MANUAL');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "extractedAmount" DOUBLE PRECISION,
ADD COLUMN     "extractedCurrency" TEXT,
ADD COLUMN     "extractedData" JSONB,
ADD COLUMN     "extractedDate" TIMESTAMP(3),
ADD COLUMN     "extractedTax" DOUBLE PRECISION,
ADD COLUMN     "extractedVendor" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "s3Bucket" TEXT,
ADD COLUMN     "s3Key" TEXT;

-- CreateTable
CREATE TABLE "DocumentMatch" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "matchReason" TEXT,
    "isUserConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMatch_documentId_transactionId_key" ON "DocumentMatch"("documentId", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_planId_key" ON "Subscription"("userId", "planId");

-- AddForeignKey
ALTER TABLE "DocumentMatch" ADD CONSTRAINT "DocumentMatch_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentMatch" ADD CONSTRAINT "DocumentMatch_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
