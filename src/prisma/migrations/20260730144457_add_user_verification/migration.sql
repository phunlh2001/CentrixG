-- AlterTable
ALTER TABLE "users" ADD COLUMN     "codeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationCode" TEXT;

-- CreateIndex
CREATE INDEX "users_isVerified_codeExpiresAt_idx" ON "users"("isVerified", "codeExpiresAt");
