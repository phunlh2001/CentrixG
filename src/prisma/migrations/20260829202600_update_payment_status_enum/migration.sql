-- Step 1: Update any rows that might have REFUNDED status to CANCELED
UPDATE "orders" SET "status" = 'PENDING' WHERE "status"::text = 'REFUNDED';

-- Step 2: Create new enum type
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELED');

-- Step 3: Alter table column to use new enum type
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Step 4: Drop old enum type and rename new enum type
DROP TYPE "PaymentStatus";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
