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
  OrderStatusResponseModel,
} from '@app/shared';
import { Currency, PaymentStatus } from '../../prisma/prisma-client';
import { ConfigService } from '@nestjs/config';

const DEFAULT_EXPIRED_SECONDS = 900; // 15 minutes default expiration

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates or reuses a pending order for SePay payment.
   * Strictly enforces 1 Product and 1 User per Order:
   * - If an unexpired pending order for the same user, same product, and exact same amount exists, reuses it with remaining time left.
   * - If order details changed (different product / amount) or order expired, hard-deletes the old order and creates a new one with 900s expiration.
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

    // if (!dto.productId) {
    //   throw new BadRequestException('Product ID is required for order');
    // }

    // 1. Verify target product exists and is not soft-deleted
    const product = await this.prisma.product.findFirst({
      where: {
        // id: dto.productId,
        isDelete: false,
      },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${dto.productId} not found or unavailable`,
      );
    }

    const now = new Date();

    // 2. Check if user already has an active pending order
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: PaymentStatus.PENDING,
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
          Number(existingOrder.amount) === Number(dto.amount);
        const isSameProduct = existingOrder.productId === dto.productId;

        if (isSameAmount && isSameProduct) {
          // Re-use existing unexpired matching order
          return this.buildCreateOrderResponse(
            existingOrder.orderCode,
            Number(existingOrder.amount),
            remainingSeconds,
            existingOrder.productId,
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

    // 3. Create new order with default 900s expiration
    const orderCode = await this.generateUniqueOrderCode();

    const order = await this.prisma.order.create({
      data: {
        orderCode,
        amount: dto.amount,
        currency: Currency.VND,
        status: PaymentStatus.PENDING,
        expired: DEFAULT_EXPIRED_SECONDS,
        userId,
        productId: dto.productId ?? '',
      },
    });

    return this.buildCreateOrderResponse(
      order.orderCode,
      Number(order.amount),
      DEFAULT_EXPIRED_SECONDS,
      order.productId,
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
      existingOrder.productId,
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
    productId: string,
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
      accountNumber,
      accountName,
      bankName,
      qrCodeUrl,
      expired: expiredSeconds,
      productId,
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
