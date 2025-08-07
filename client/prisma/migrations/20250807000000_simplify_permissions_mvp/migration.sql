-- Simplify permissions for MVP - Keep only FULL_MANAGEMENT

-- Update existing BusinessMember records to use FULL_MANAGEMENT
UPDATE "BusinessMember" 
SET "accessLevel" = 'FULL_MANAGEMENT'
WHERE "accessLevel" IN ('VIEW_ONLY', 'FINANCIAL_ONLY', 'DOCUMENTS_ONLY');

-- Update existing TeamInvitation records to use FULL_MANAGEMENT
UPDATE "TeamInvitation"
SET "accessLevel" = 'FULL_MANAGEMENT'
WHERE "accessLevel" IN ('VIEW_ONLY', 'FINANCIAL_ONLY', 'DOCUMENTS_ONLY');

-- Create a new enum with only FULL_MANAGEMENT
CREATE TYPE "BusinessAccessLevel_new" AS ENUM ('FULL_MANAGEMENT');

-- Update columns to use the new enum
ALTER TABLE "BusinessMember" 
  ALTER COLUMN "accessLevel" DROP DEFAULT,
  ALTER COLUMN "accessLevel" TYPE "BusinessAccessLevel_new" 
    USING ("accessLevel"::text::"BusinessAccessLevel_new"),
  ALTER COLUMN "accessLevel" SET DEFAULT 'FULL_MANAGEMENT';

ALTER TABLE "TeamInvitation"
  ALTER COLUMN "accessLevel" DROP DEFAULT,
  ALTER COLUMN "accessLevel" TYPE "BusinessAccessLevel_new" 
    USING ("accessLevel"::text::"BusinessAccessLevel_new"),
  ALTER COLUMN "accessLevel" SET DEFAULT 'FULL_MANAGEMENT';

-- Drop the old enum and rename the new one
DROP TYPE "BusinessAccessLevel";
ALTER TYPE "BusinessAccessLevel_new" RENAME TO "BusinessAccessLevel";