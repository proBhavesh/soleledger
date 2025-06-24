/*
  Warnings:

  - A unique constraint covering the columns `[email,businessId]` on the table `TeamInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BusinessAccessLevel" AS ENUM ('VIEW_ONLY', 'FULL_MANAGEMENT', 'FINANCIAL_ONLY', 'DOCUMENTS_ONLY');

-- AlterTable
ALTER TABLE "BusinessMember" ADD COLUMN     "accessLevel" "BusinessAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY',
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "invitedBy" TEXT,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "permissions" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_email_businessId_key" ON "TeamInvitation"("email", "businessId");

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
