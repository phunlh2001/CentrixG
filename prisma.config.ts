import * as path from 'node:path';
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * Prisma 7 no longer reads the `prisma` key from package.json and does not
 * auto-load `.env` when a config file is present — hence the explicit
 * `dotenv/config` import above.
 *
 * The schema (and its migrations) live under `src/prisma`, and the new
 * `prisma-client` generator emits the client to `src/generated/prisma`.
 */
export default defineConfig({
  schema: path.join('src', 'prisma', 'schema.prisma'),
  // Connection URL used by Prisma Migrate / CLI (the runtime client uses a
  // driver adapter instead — see PrismaService).
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
    // No `seed` configured — the database starts empty after migrations.
  },
});
