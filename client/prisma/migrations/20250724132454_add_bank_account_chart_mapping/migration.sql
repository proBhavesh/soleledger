-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "chartOfAccountsId" TEXT;

-- CreateIndex
CREATE INDEX "BankAccount_chartOfAccountsId_idx" ON "BankAccount"("chartOfAccountsId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_chartOfAccountsId_fkey" FOREIGN KEY ("chartOfAccountsId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
