import { PrismaService } from '@app/prisma/prisma.service';
import {
  AdminBillItemModel,
  AdminBillPaginatedResponseModel,
  AdminBillQueryDto,
  BillPaymentAmountModel,
  BillProductInfoModel,
  BillReferrerInfoModel,
  BillUserInfoModel,
} from '@app/shared';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/prisma-client';

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AdminBillQueryDto,
  ): Promise<AdminBillPaginatedResponseModel> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();

    const where: Prisma.OrderWhereInput = search
      ? {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { orderCode: { contains: search, mode: 'insensitive' } },
            {
              user: {
                username: { contains: search, mode: 'insensitive' },
              },
            },
            {
              user: {
                email: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: {
              products: {
                select: {
                  id: true,
                  appId: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const items: AdminBillItemModel[] = orders.map((order) => {
      // 1. BILL / ORDER ID
      const billId = order.orderCode || order.id;

      // 2. PRODUCT INFO
      const productInfo: BillProductInfoModel[] = order.user?.products
        ? order.user.products.map((p) => ({
            id: p.id,
            appId: p.appId,
            name: p.name,
            imageUrl: p.imageUrl,
          }))
        : [];

      // 3. USER ACCOUNT
      const userAccount: BillUserInfoModel = order.user
        ? {
            id: order.user.id,
            username: order.user.username,
            email: order.user.email,
          }
        : {
            id: 'guest',
            username: 'Guest Account',
            email: 'guest@centrix.dev',
          };

      // 4. REFERRER INFO (null if no referrer tracking)
      const referrerInfo: BillReferrerInfoModel | null = null;

      // 5. PAYMENT AMOUNT (VND / USD / CNY)
      const vndAmount = Number(order.amount);
      const usdAmount = Math.round((vndAmount / 25400) * 100) / 100;
      const cnyAmount = Math.round((vndAmount / 3550) * 100) / 100;

      const paymentAmount: BillPaymentAmountModel = {
        vnd: vndAmount,
        usd: usdAmount,
        cny: cnyAmount,
      };

      // 6. DATE & TIME
      return {
        id: billId,
        productInfo,
        userAccount,
        referrerInfo,
        paymentAmount,
        createdAt: order.createdAt,
      };
    });

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
