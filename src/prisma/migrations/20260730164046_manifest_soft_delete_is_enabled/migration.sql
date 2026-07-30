/*
  Warnings:

  - You are about to drop the column `isActive` on the `manifest_files` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "manifest_files" DROP COLUMN "isActive",
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "manifest_files_isEnabled_idx" ON "manifest_files"("isEnabled");
