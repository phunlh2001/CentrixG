import { Injectable } from '@nestjs/common';
import {
  AdminOverviewResponseModel,
  OverviewPeriod,
  RecentUserModel,
  TopSellerProductModel,
} from '@app/shared';
import { PrismaService } from '@app/prisma/prisma.service';
import { Currency, PaymentStatus, Role } from '@app/prisma/prisma-client';

const USD_EXCHANGE_RATE = 25400; // VND per 1 USD
const CNY_EXCHANGE_RATE = 3550; // VND per 1 CNY

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates admin platform overview metrics for weekly or monthly timeframes,
   * matching all statistics, top sellers, account counts, and recent user lists in picture1.
   */
  async getOverview(
    period: OverviewPeriod = OverviewPeriod.WEEKLY,
  ): Promise<AdminOverviewResponseModel> {
    const isWeekly = period === OverviewPeriod.WEEKLY;
    const now = new Date();
    const startDate = isWeekly
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dateRangeText = isWeekly ? 'Last 7 Days' : 'Current Month';

    // 1. Total Revenue Aggregation
    const completedBills = await this.prisma.bill.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: startDate },
      },
      select: { amount: true },
    });

    const totalRevenueVnd = completedBills.reduce(
      (sum, bill) => sum + Number(bill.amount),
      0,
    );

    const usdEquivalent =
      Math.round((totalRevenueVnd / USD_EXCHANGE_RATE) * 100) / 100;
    const cnyEquivalent =
      Math.round((totalRevenueVnd / CNY_EXCHANGE_RATE) * 100) / 100;

    // 2. Top Seller Products (Max 3)
    const products = await this.prisma.product.findMany({
      where: { isDelete: false },
      include: {
        prices: true,
        categories: { select: { name: true } },
        owners: { select: { id: true } },
      },
    });

    // Rank products by number of paid owners
    const rankedProducts = products
      .map((p) => {
        const vndPriceObj = p.prices.find(
          (price) => price.currency === Currency.VND,
        );
        const priceVnd = vndPriceObj ? Number(vndPriceObj.amount) : 0;
        const paidUsersCount = p.owners.length;
        const productTotalRevenue = paidUsersCount * priceVnd;
        const primaryCategory =
          p.categories.length > 0 ? p.categories[0].name : 'Action Game';

        return {
          product: p,
          priceVnd,
          paidUsersCount,
          productTotalRevenue,
          primaryCategory,
        };
      })
      .sort((a, b) => b.paidUsersCount - a.paidUsersCount)
      .slice(0, 3);

    const topSellers: TopSellerProductModel[] = rankedProducts.map(
      (item, index) => ({
        rank: index + 1,
        id: item.product.id,
        appId: item.product.appId,
        name: item.product.name,
        category: item.primaryCategory,
        priceVnd: item.priceVnd,
        imageUrl: item.product.imageUrl,
        paidUsersCount: item.paidUsersCount,
        totalRevenueVnd: item.productTotalRevenue,
      }),
    );

    // 3. Account Counters
    const activeAccountsCount = await this.prisma.user.count({
      where: { isBlock: false, role: { not: Role.ADMIN } },
    });

    const bannedAccountsCount = await this.prisma.user.count({
      where: { isBlock: true, role: { not: Role.ADMIN } },
    });

    // 4. Newly Created Accounts (Without passwordHash)
    const recentUsersRaw = await this.prisma.user.findMany({
      where: { role: { not: Role.ADMIN } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBlock: true,
        createdAt: true,
      },
    });

    const recentUsers: RecentUserModel[] = recentUsersRaw.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.isBlock ? 'banned' : 'active',
      createdAt: u.createdAt,
    }));

    return {
      period,
      dateRangeText,
      revenue: {
        totalRevenueVnd,
        usdEquivalent,
        cnyEquivalent,
      },
      topSellers,
      accountMetrics: {
        activeAccountsCount,
        bannedAccountsCount,
      },
      recentUsers,
    };
  }
}
