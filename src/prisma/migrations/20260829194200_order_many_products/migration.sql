-- CreateTable "_OrderProducts"
CREATE TABLE IF NOT EXISTS "_OrderProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrderProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_OrderProducts_B_index" ON "_OrderProducts"("B");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_OrderProducts_A_fkey'
  ) THEN
    ALTER TABLE "_OrderProducts" ADD CONSTRAINT "_OrderProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_OrderProducts_B_fkey'
  ) THEN
    ALTER TABLE "_OrderProducts" ADD CONSTRAINT "_OrderProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 1: Migrate all existing order-product associations to the join table (Zero Data Loss)
INSERT INTO "_OrderProducts" ("A", "B")
SELECT "id", "productId"
FROM "orders"
WHERE "productId" IS NOT NULL
ON CONFLICT ("A", "B") DO NOTHING;

-- Step 2: Drop the legacy single-product foreign key constraint
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_productId_fkey";

-- Step 3: Drop the legacy index
DROP INDEX IF EXISTS "orders_productId_idx";

-- Step 4: Drop the legacy single productId column
ALTER TABLE "orders" DROP COLUMN IF EXISTS "productId";
