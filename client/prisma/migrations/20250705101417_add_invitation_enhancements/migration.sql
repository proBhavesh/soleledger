/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `TeamInvitation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invitationType` to the `TeamInvitation` table without a default value. This is not possible if the table is not empty.
  - The required column `token` was added to the `TeamInvitation` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('NEW_USER', 'EXISTING_NO_BUSINESS', 'EXISTING_WITH_BUSINESS');

-- AlterTable
ALTER TABLE "TeamInvitation" ADD COLUMN     "accessLevel" "BusinessAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY',
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "invitationType" "InvitationType" NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_token_key" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_token_idx" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_senderId_idx" ON "TeamInvitation"("senderId");

-- CreateIndex
CREATE INDEX "TeamInvitation_status_idx" ON "TeamInvitation"("status");

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
