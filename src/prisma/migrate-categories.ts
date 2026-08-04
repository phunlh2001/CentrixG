import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma-client';

async function migrateData() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is missing');
  }

  const adapter = new PrismaPg(dbUrl);
  const prisma = new PrismaClient({ adapter });

  console.log('🚀 Starting Database Migration...');

  try {
    // 1. Rename table "categories" to "types" if "categories" exists with "description" column (old table)
    console.log('📦 Renaming "categories" table to "types"...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'categories'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'categories' AND column_name = 'description'
        ) THEN
          ALTER TABLE "categories" RENAME TO "types";
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories_id_seq') THEN
            ALTER SEQUENCE "categories_id_seq" RENAME TO "types_id_seq";
          END IF;
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories_pkey') THEN
            ALTER INDEX "categories_pkey" RENAME TO "types_pkey";
          END IF;
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories_name_key') THEN
            ALTER INDEX "categories_name_key" RENAME TO "types_name_key";
          END IF;
        END IF;
      END $$;
    `);

    // 2. Rename table "product_categories" to "product_types"
    console.log('📦 Renaming "product_categories" table to "product_types"...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'product_categories'
        ) THEN
          ALTER TABLE "product_categories" RENAME TO "product_types";
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'product_types' AND column_name = 'categoryId'
          ) THEN
            ALTER TABLE "product_types" RENAME COLUMN "categoryId" TO "typeId";
          END IF;
        END IF;
      END $$;
    `);

    // 3. Create the new "categories" table
    console.log('✨ Creating new "categories" table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "categories_productId_name_key" ON "categories"("productId", "name");
      CREATE INDEX IF NOT EXISTS "categories_productId_idx" ON "categories"("productId");
      CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories"("name");
    `);

    // 4. Migrate genres & categories from "products" table into "categories" table
    console.log('🚚 Migrating product genres and categories into new "categories" table...');
    const insertedCount = await prisma.$executeRawUnsafe(`
      INSERT INTO "categories" ("id", "productId", "name", "createdAt", "updatedAt")
      SELECT 
        gen_random_uuid()::text AS "id",
        p."id" AS "productId",
        val AS "name",
        NOW() AS "createdAt",
        NOW() AS "updatedAt"
      FROM (
        SELECT "id", unnest(array_cat("genres", "categories")) AS val
        FROM "products"
      ) p
      WHERE val IS NOT NULL AND trim(val) <> ''
      ON CONFLICT ("productId", "name") DO NOTHING;
    `);

    console.log(`✅ Migrated ${insertedCount} category entries into the new "categories" table!`);

    // 5. Drop columns "genres", "categories", "tags" from "products" table
    console.log('🧹 Dropping old array columns (genres, categories, tags) from "products" table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "products" DROP COLUMN IF EXISTS "genres";
      ALTER TABLE "products" DROP COLUMN IF EXISTS "categories";
      ALTER TABLE "products" DROP COLUMN IF EXISTS "tags";
    `);

    console.log('🎉 Migration finished successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
