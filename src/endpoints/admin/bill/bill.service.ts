import { MessageResponseDto } from '../../../common/dto/message-response.dto';
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
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '../../../prisma/prisma-client';

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AdminBillQueryDto,
  ): Promise<AdminBillPaginatedResponseModel> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
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
            {
              products: {
                some: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {};

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          products: {
            select: {
              id: true,
              appId: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const items: AdminBillItemModel[] = orders.map((order) => {
      // 1. BILL / ORDER ID
      const billId = order.orderCode || order.id;

      // 2. PRODUCTS LIST & PRIMARY PRODUCT INFO
      const products: BillProductInfoModel[] = order.products.map((p) => ({
        id: p.id,
        appId: p.appId,
        name: p.name,
        imageUrl: p.imageUrl,
      }));

      // 3. USER ACCOUNT
      const userAccount: BillUserInfoModel = {
        id: order.user.id,
        username: order.user.username,
        email: order.user.email,
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

      return {
        id: billId,
        products,
        userAccount,
        referrerInfo,
        orderStatus: order.status,
        paymentAmount,
        createdAt: order.createdAt,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Refunds an order/bill:
   * - Validates that order exists.
   * - Validates that order status is COMPLETED. If not, throws BadRequestException.
   * - Sets order status to REFUNDED.
   * - Removes all products in the order from the customer's library (disconnects from User.products).
   * Returns a standard MessageResponseDto.
   */
  async refund(id: string): Promise<MessageResponseDto> {
    if (!id || !id.trim()) {
      throw new BadRequestException('Order / Bill ID must be provided');
    }

    const trimmedId = id.trim();

    // 1. Find order by ID or orderCode
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: trimmedId }, { orderCode: trimmedId }],
      },
      include: {
        products: {
          select: { id: true },
        },
        user: {
          select: { id: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order / Bill '${trimmedId}' not found`);
    }

    // 2. Validator: Order must be in COMPLETED status
    if (order.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException(
        `Order ${order.orderCode || order.id} has already been refunded`,
      );
    }

    if (order.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot refund order ${order.orderCode || order.id} with status "${order.status}". Only COMPLETED orders can be refunded.`,
      );
    }

    // 3. Atomically update order status to REFUNDED and disconnect products from user library
    await this.prisma.$transaction(async (tx) => {
      // Change order status to REFUNDED
      await tx.order.update({
        where: { id: order.id },
        data: { status: PaymentStatus.REFUNDED },
      });

      // Remove all products in the order from user's library
      if (order.products.length > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            products: {
              disconnect: order.products.map((p) => ({ id: p.id })),
            },
          },
        });
      }
    });

    return {
      message: `Order ${order.orderCode || order.id} has been refunded successfully and products were removed from user library`,
    };
  }
}

