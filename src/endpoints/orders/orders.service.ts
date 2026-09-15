import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SEPAY_CONFIG } from '../../common/constants/sepay.constants';
import {
  CreateOrderDto,
  CreateOrderResponseModel,
  FirstPurchaseResponseModel,
  GetLatestOrderQueryDto,
  OrderStatusResponseModel,
} from '@app/shared';

import { Currency, PaymentStatus, Role } from '../../prisma/prisma-client';
import { ConfigService } from '@nestjs/config';

const DEFAULT_EXPIRED_SECONDS = 900; // 15 minutes default expiration

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Checks whether the current user is eligible for the initial purchase offer (has 0 completed orders),
   * and returns any previously bound referral offerCode.
   */
  async checkFirstPurchase(userId: string): Promise<FirstPurchaseResponseModel> {
    if (!userId) {
      throw new UnauthorizedException(
        'User must be logged in to check purchase status',
      );
    }

    const [completedOrdersCount, user] = await Promise.all([
      this.prisma.order.count({
        where: {
          userId,
          status: PaymentStatus.COMPLETED,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { usedOfferCode: true },
      }),
    ]);

    return {
      isFirstPurchase: completedOrdersCount === 0,
      usedOfferCode: user?.usedOfferCode ?? null,
    };
  }

  /**
   * Generates or reuses a pending order for SePay payment.
   * Supports 1 to N products per order:
   * - If an unexpired pending order for the same user, exact same products, amount, and offerCode exists, reuses it with remaining time left.
   * - If order details changed (different products / amount / offerCode) or order expired, hard-deletes the old order and creates a new one with 900s expiration.
   * - If offerCode is provided:
   *   + Customer receives 10% discount on their first order (subsequent orders pay full price).
   *   + Even if the referring seller is demoted, customer still receives 10% discount on their first order.
   *   + The referring seller receives 10% commission on the total order value only if currently active.
   *   + Bound referral offerCode is permanently saved to customer profile for automatic future reuse.
   */
  async createOrder(
    dto: CreateOrderDto,
    userId: string,
  ): Promise<CreateOrderResponseModel> {
    if (!userId) {
      throw new UnauthorizedException(
        'User must be logged in to create an order',
      );
    }

    if (!dto.productIds || dto.productIds.length === 0) {
      throw new BadRequestException('Order must contain at least 1 product');
    }

    const uniqueProductIds = Array.from(new Set(dto.productIds));

    // 1. Verify all target products exist and are not soft-deleted
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        isDelete: false,
        disabled: false,
      },
      select: { id: true, name: true },
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = uniqueProductIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `These products are unavailable or do not exist: ${missing.join(', ')}`,
      );
    }

    // 2. Fetch customer and determine referral offerCode
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, usedOfferCode: true },
    });

    let sellerId: string | null = null;
    let appliedOfferCode: string | null = null;
    let discountAmount = 0;
    let commissionAmount = 0;
    let finalOrderAmount = Number(dto.amount);

    const manualCode =
      typeof dto.offerCode === 'string' && dto.offerCode.trim() !== ''
        ? dto.offerCode.trim().toUpperCase()
        : null;

    // Permanent referral binding: once a user has a usedOfferCode, always use that code (no switching)
    const targetCode = user?.usedOfferCode ?? manualCode;

    if (targetCode) {
      const seller = await this.prisma.user.findUnique({
        where: { offerCode: targetCode },
      });

      if (!seller) {
        if (manualCode && !user?.usedOfferCode) {
          throw new BadRequestException('Invalid offer code');
        }
      } else if (seller.id === userId) {
        if (manualCode && !user?.usedOfferCode) {
          throw new BadRequestException('You cannot use your own seller offer code');
        }
      } else {
        appliedOfferCode = seller.offerCode;
        const isSellerActive = seller.role === Role.SELLER && !seller.isBlock;

        // Check if customer is making their initial purchase
        const { isFirstPurchase } = await this.checkFirstPurchase(userId);

        if (isFirstPurchase) {
          // Customer always receives 10% discount for their first order (even if seller is demoted)
          discountAmount = Math.round(Number(dto.amount) * 0.1);
          finalOrderAmount = Number(dto.amount) - discountAmount;

          // Seller only receives 10% commission if active (not demoted and not blocked)
          if (isSellerActive) {
            sellerId = seller.id;
            commissionAmount = Math.round(Number(dto.amount) * 0.1);
          }

          // Permanently save usedOfferCode to customer account
          if (!user?.usedOfferCode && appliedOfferCode) {
            await this.prisma.user.update({
              where: { id: userId },
              data: { usedOfferCode: appliedOfferCode },
            });
          }
        } else {
          // Subsequent order: 0% discount on order itself (customer pays full price)
          discountAmount = 0;
          finalOrderAmount = Number(dto.amount);

          // Seller receives 10% commission on the total order value if active
          if (isSellerActive) {
            sellerId = seller.id;
            commissionAmount = Math.round(Number(dto.amount) * 0.1);
          }

          // Ensure usedOfferCode is bound if not already present
          if (!user?.usedOfferCode && appliedOfferCode) {
            await this.prisma.user.update({
              where: { id: userId },
              data: { usedOfferCode: appliedOfferCode },
            });
          }
        }
      }
    }



    const now = new Date();

    // 3. Check if user already has an active pending order
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: PaymentStatus.PENDING,
      },
      include: {
        products: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOrder) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - existingOrder.createdAt.getTime()) / 1000,
      );
      const remainingSeconds = existingOrder.expired - elapsedSeconds;

      if (remainingSeconds > 0) {
        const isSameAmount =
          Number(existingOrder.amount) === Number(finalOrderAmount);
        const isSameOfferCode =
          existingOrder.offerCode === appliedOfferCode;
        const existingIds = new Set(existingOrder.products.map((p) => p.id));
        const isSameProducts =
          existingIds.size === uniqueProductIds.length &&
          uniqueProductIds.every((id) => existingIds.has(id));

        if (isSameAmount && isSameProducts && isSameOfferCode) {
          // Re-use existing unexpired matching order
          return this.buildCreateOrderResponse(
            existingOrder.orderCode,
            Number(existingOrder.amount),
            remainingSeconds,
            existingOrder.products.map((p) => p.id),
            existingOrder.offerCode,
            existingOrder.discountAmount ? Number(existingOrder.discountAmount) : null,
          );
        } else {
          // Details changed -> hard-delete old order and proceed to create new one
          await this.prisma.order.delete({
            where: { id: existingOrder.id },
          });
        }
      } else {
        // Expired -> hard-delete old order
        await this.prisma.order.delete({
          where: { id: existingOrder.id },
        });
      }
    }

    // 4. Clean up any stale pending orders for this user to ensure only 1 PENDING order exists at a time
    await this.prisma.order.deleteMany({
      where: {
        userId,
        status: PaymentStatus.PENDING,
      },
    });

    const orderCode = await this.generateUniqueOrderCode();

    const order = await this.prisma.order.create({
      data: {
        orderCode,
        amount: finalOrderAmount,
        currency: Currency.VND,
        status: PaymentStatus.PENDING,
        expired: DEFAULT_EXPIRED_SECONDS,
        userId,
        sellerId,
        offerCode: appliedOfferCode,
        discountAmount,
        commissionAmount,
        products: {
          connect: uniqueProductIds.map((id) => ({ id })),
        },
      },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    return this.buildCreateOrderResponse(
      order.orderCode,
      Number(order.amount),
      DEFAULT_EXPIRED_SECONDS,
      order.products.map((p) => p.id),
      order.offerCode,
      order.discountAmount ? Number(order.discountAmount) : null,
    );
  }

  /**
   * Fetches latest active pending order for current user and calculates remaining time left.
   * If query parameters (totalAmount, length) are provided, verifies that the existing pending order
   * matches the expected total amount and item count. Returns null if there is any mismatch.
   */
  async getLatestOrder(
    userId: string,
    query?: GetLatestOrderQueryDto,
  ): Promise<CreateOrderResponseModel | null> {
    if (!userId) {
      throw new UnauthorizedException(
        'User must be logged in to view latest order',
      );
    }

    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: PaymentStatus.PENDING,
      },
      include: {
        products: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingOrder) {
      return null;
    }

    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - existingOrder.createdAt.getTime()) / 1000,
    );
    const remainingSeconds = existingOrder.expired - elapsedSeconds;

    if (remainingSeconds <= 0) {
      // Hard delete expired order
      await this.prisma.order.delete({
        where: { id: existingOrder.id },
      });
      return null;
    }

    // Verify against query params if provided: total amount and length of items
    const expectedAmount = query?.totalAmount;
    const expectedLength = query?.length;

    if (expectedLength !== undefined && expectedLength !== null) {
      const orderProductsLength = existingOrder.products?.length ?? 0;
      if (orderProductsLength !== Number(expectedLength)) {
        return null;
      }
    }

    if (expectedAmount !== undefined && expectedAmount !== null) {
      const orderPayableAmount = Number(existingOrder.amount);
      const orderPreDiscountAmount =
        orderPayableAmount + Number(existingOrder.discountAmount ?? 0);

      const targetAmount = Number(expectedAmount);
      // Matches either payable amount (discounted) or base pre-discount amount
      if (
        orderPayableAmount !== targetAmount &&
        orderPreDiscountAmount !== targetAmount
      ) {
        return null;
      }
    }

    return this.buildCreateOrderResponse(
      existingOrder.orderCode,
      Number(existingOrder.amount),
      remainingSeconds,
      existingOrder.products.map((p) => p.id),
      existingOrder.offerCode,
      existingOrder.discountAmount ? Number(existingOrder.discountAmount) : null,
    );
  }

  /**
   * Fetches order status by orderCode.
   */
  async getOrderStatus(orderCode: string): Promise<OrderStatusResponseModel> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
    });

    if (!order) {
      throw new NotFoundException(`Order code ${orderCode} not found`);
    }

    return {
      orderCode: order.orderCode,
      amount: Number(order.amount),
      status: order.status,
      createdAt: order.createdAt,
    };
  }

  private buildCreateOrderResponse(
    orderCode: string,
    amount: number,
    expiredSeconds: number,
    productIds: string[],
    offerCode?: string | null,
    discountAmount?: number | null,
  ): CreateOrderResponseModel {
    const accountNumber = this.config.getOrThrow<string>(
      SEPAY_CONFIG.accountNumber,
    );
    const accountName = this.config.getOrThrow<string>(
      SEPAY_CONFIG.accountName,
    );
    const bankName = this.config.getOrThrow<string>(SEPAY_CONFIG.bankName);
    const encodedAccountName = encodeURIComponent(accountName);
    const qrCodeUrl = `https://vietqr.app/img?bank=${bankName}&acc=${accountNumber}&template=compact&amount=${amount}&des=${orderCode}&showinfo=true&holder=${encodedAccountName}`;

    return {
      orderCode,
      amount,
      offerCode: offerCode ?? null,
      discountAmount: discountAmount ?? null,
      accountNumber,
      accountName,
      bankName,
      qrCodeUrl,
      expired: expiredSeconds,
      productIds,
    };
  }

  private async generateUniqueOrderCode(): Promise<string> {
    for (let attempts = 0; attempts < 10; attempts++) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const code = `CG${randomDigits}`;

      const existing = await this.prisma.order.findUnique({
        where: { orderCode: code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    }

    // Fallback if random 6 digits collided 10 times
    return `CG${Date.now().toString().slice(-8)}`;
  }
}
