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
   * Checks whether the current user is eligible for the initial purchase offer (has 0 completed orders).
   */
  async checkFirstPurchase(userId: string): Promise<FirstPurchaseResponseModel> {
    if (!userId) {
      throw new UnauthorizedException(
        'User must be logged in to check purchase status',
      );
    }

    const completedOrdersCount = await this.prisma.order.count({
      where: {
        userId,
        status: PaymentStatus.COMPLETED,
      },
    });

    return {
      isFirstPurchase: completedOrdersCount === 0,
    };
  }

  /**
   * Generates or reuses a pending order for SePay payment.
   * Supports 1 to N products per order:
   * - If an unexpired pending order for the same user, exact same products, amount, and offerCode exists, reuses it with remaining time left.
   * - If order details changed (different products / amount / offerCode) or order expired, hard-deletes the old order and creates a new one with 900s expiration.
   * - If offerCode is provided, verifies user is a first-time buyer, applies 10% discount, and allocates 10% seller commission.
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

    // 2. Validate offerCode if provided (applies only to first-time customer purchase)
    let sellerId: string | null = null;
    let appliedOfferCode: string | null = null;
    let discountAmount = 0;
    let commissionAmount = 0;
    let finalOrderAmount = Number(dto.amount);

    if (dto.offerCode) {
      const normalizedCode = dto.offerCode.trim().toUpperCase();

      // Check initial purchase
      const { isFirstPurchase } = await this.checkFirstPurchase(userId);
      if (!isFirstPurchase) {
        throw new BadRequestException(
          'Offer code discount is only applicable for your initial purchase',
        );
      }

      // Look up seller by offerCode
      const seller = await this.prisma.user.findUnique({
        where: { offerCode: normalizedCode },
      });

      if (!seller || seller.role !== Role.SELLER || seller.isBlock) {
        throw new BadRequestException('Invalid or inactive seller offer code');
      }

      // Prevent self-referral
      if (seller.id === userId) {
        throw new BadRequestException(
          'You cannot use your own seller offer code',
        );
      }

      sellerId = seller.id;
      appliedOfferCode = seller.offerCode;
      discountAmount = Math.round(finalOrderAmount * 0.1);
      finalOrderAmount = finalOrderAmount - discountAmount;
      commissionAmount = Math.round(Number(dto.amount) * 0.1);
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

    // 4. Create new order with default 900s expiration
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
   */
  async getLatestOrder(
    userId: string,
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
