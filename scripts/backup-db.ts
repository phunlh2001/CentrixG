import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/prisma-client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  const adapter = new PrismaPg(databaseUrl);
  const prisma = new PrismaClient({ adapter });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '..', 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `backup_db_${timestamp}.json`);
  console.log(`Starting database backup to: ${backupPath}`);

  try {
    const [users, products, orders, tokens, loginLogs] = await Promise.all([
      prisma.user.findMany(),
      prisma.product.findMany(),
      prisma.order.findMany(),
      prisma.token.findMany(),
      prisma.loginLog.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        products: products.length,
        orders: orders.length,
        tokens: tokens.length,
        loginLogs: loginLogs.length,
      },
      data: {
        users,
        products,
        orders,
        tokens,
        loginLogs,
      },
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`Backup completed successfully!`);
    console.log(`Exported records count: ${JSON.stringify(backupData.counts, null, 2)}`);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
