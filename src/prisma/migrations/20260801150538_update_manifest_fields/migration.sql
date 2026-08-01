/*
  Warnings:

  - You are about to drop the column `depotId` on the `manifest_files` table. All the data in the column will be lost.
  - You are about to drop the column `manifestId` on the `manifest_files` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `manifest_files` table. All the data in the column will be lost.
  - The `manifestData` column on the `manifest_files` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "manifest_files" DROP COLUMN "depotId",
DROP COLUMN "manifestId",
DROP COLUMN "version",
DROP COLUMN "manifestData",
ADD COLUMN     "manifestData" BYTEA;
