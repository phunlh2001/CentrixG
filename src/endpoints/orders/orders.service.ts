import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SEPAY_CONFIG } from '../../common/constants/sepay.constants';
import {
  CreateOrderDto,
  CreateOrderResponseModel,
  OrderStatusResponseModel,
} from '@app/shared';
import { Currency, PaymentStatus } from '../../prisma/prisma-client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generates a unique orderCode, creates a pending Order & Bill record in DB,
   * and builds VietQR banking QR code details.
   */
  async createOrder(
    dto: CreateOrderDto,
    userId?: string,
  ): Promise<CreateOrderResponseModel> {
    const orderCode = await this.generateUniqueOrderCode();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create linked Bill record if userId exists or system bill record
      let billId: string | undefined = undefined;

      if (userId) {
        const bill = await tx.bill.create({
          data: {
            userId,
            amount: dto.amount,
            currency: Currency.VND,
            paymentMethod: 'SEPAY',
            transactionRef: orderCode,
            status: PaymentStatus.PENDING,
          },
        });
        billId = bill.id;
      }

      // 2. Create Order record
      const order = await tx.order.create({
        data: {
          orderCode,
          amount: dto.amount,
          status: PaymentStatus.PENDING,
          userId: userId ?? null,
          billId: billId ?? null,
        },
      });

      return order;
    });

    const accountNumber = this.config.getOrThrow<string>(SEPAY_CONFIG.accountNumber);
    const accountName = this.config.getOrThrow<string>(SEPAY_CONFIG.accountName);
    const bankName = this.config.getOrThrow<string>(SEPAY_CONFIG.bankName);
    const encodedAccountName = encodeURIComponent(accountName);
    const qrCodeUrl = `https://vietqr.app/img?bank=${bankName}&acc=${accountNumber}&template=compact&amount=${dto.amount}&des=${result.orderCode}&showinfo=true&holder=${encodedAccountName}`;
    
    return {
      orderCode: result.orderCode,
      amount: Number(result.amount),
      accountNumber,
      accountName,
      bankName, 
      qrCodeUrl,
    };
  }

  /**
   * Fetches order status and linked bill status by orderCode.
   */
  async getOrderStatus(orderCode: string): Promise<OrderStatusResponseModel> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: {
        bill: {
          select: { status: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order code ${orderCode} not found`);
    }

    return {
      orderCode: order.orderCode,
      amount: Number(order.amount),
      status: order.status,
      billStatus: order.bill?.status ?? null,
      createdAt: order.createdAt,
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
