import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/prisma-client';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const adapter = new PrismaPg(databaseUrl!);
  const prisma = new PrismaClient({ adapter });

  try {
    const orders = await prisma.order.findMany({
      include: {
        products: {
          select: { id: true, name: true, appId: true },
        },
      },
    });

    console.log(`Total orders in DB: ${orders.length}`);
    for (const order of orders) {
      console.log(`Order ${order.orderCode} (Amount: ${order.amount}): ${order.products.length} products -> [${order.products.map(p => `${p.name} (#${p.appId})`).join(', ')}]`);
    }
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
