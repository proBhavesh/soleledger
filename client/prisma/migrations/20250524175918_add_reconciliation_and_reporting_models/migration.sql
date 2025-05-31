-- CreateEnum
CREATE TYPE "ReconciliationStatusType" AS ENUM ('UNMATCHED', 'MATCHED', 'PARTIALLY_MATCHED', 'PENDING_REVIEW', 'MANUALLY_MATCHED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PROFIT_LOSS', 'BALANCE_SHEET', 'CASH_FLOW', 'EXPENSE_CATEGORIES', 'RECONCILIATION_SUMMARY', 'TAX_SUMMARY', 'MONTHLY_SUMMARY');

-- CreateTable
CREATE TABLE "ReconciliationStatus" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "ReconciliationStatusType" NOT NULL DEFAULT 'UNMATCHED',
    "confidence" DOUBLE PRECISION,
    "manuallySet" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportData" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCron" TEXT,

    CONSTRAINT "ReportData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationStatus_transactionId_key" ON "ReconciliationStatus"("transactionId");

-- AddForeignKey
ALTER TABLE "ReconciliationStatus" ADD CONSTRAINT "ReconciliationStatus_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationStatus" ADD CONSTRAINT "ReconciliationStatus_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationStatus" ADD CONSTRAINT "ReconciliationStatus_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportData" ADD CONSTRAINT "ReportData_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportData" ADD CONSTRAINT "ReportData_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
