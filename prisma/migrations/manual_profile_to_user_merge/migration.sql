-- Step 1: Add new columns to User
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarColor" TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE "User" ADD COLUMN "avatarEmoji" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");

-- Step 2: Copy avatarColor and avatarEmoji from default Profile to User
UPDATE "User" u
SET
  "avatarColor" = COALESCE(p."avatarColor", '#6366f1'),
  "avatarEmoji" = p."avatarEmoji"
FROM "Profile" p
WHERE p."userId" = u.id AND p."isDefault" = true;

-- Step 3: Add userId column to UserContent
ALTER TABLE "UserContent" ADD COLUMN "userId" TEXT;

-- Step 4: Populate userId from Profile
UPDATE "UserContent" uc
SET "userId" = p."userId"
FROM "Profile" p
WHERE p.id = uc."profileId";

-- Step 5: Make userId NOT NULL
ALTER TABLE "UserContent" ALTER COLUMN "userId" SET NOT NULL;

-- Step 6: Add FK constraint
ALTER TABLE "UserContent" ADD CONSTRAINT "UserContent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Update unique constraint
ALTER TABLE "UserContent" DROP CONSTRAINT IF EXISTS "UserContent_profileId_contentId_key";
ALTER TABLE "UserContent" ADD CONSTRAINT "UserContent_userId_contentId_key" UNIQUE ("userId", "contentId");

-- Step 8: Drop old indexes
DROP INDEX IF EXISTS "UserContent_profileId_listStatus_addedAt_idx";
DROP INDEX IF EXISTS "UserContent_profileId_userRating_idx";
DROP INDEX IF EXISTS "UserContent_profileId_watchStatus_idx";

-- Step 9: Create new indexes
CREATE INDEX "UserContent_userId_listStatus_addedAt_idx" ON "UserContent"("userId", "listStatus", "addedAt" DESC);
CREATE INDEX "UserContent_userId_userRating_idx" ON "UserContent"("userId", "userRating" DESC);
CREATE INDEX "UserContent_userId_watchStatus_idx" ON "UserContent"("userId", "watchStatus");

-- Step 10: Drop profileId column
ALTER TABLE "UserContent" DROP COLUMN IF EXISTS "profileId";

-- Step 11: Drop Profile table
DROP TABLE IF EXISTS "Profile";
