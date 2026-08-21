import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SEPAY_CONFIG } from '../../common/constants/sepay.constants';
import {
  SepayWebhookDto,
  SepayWebhookResponseModel,
} from '@app/shared';
import { PaymentStatus } from '../../prisma/prisma-client';
import { ConfigService } from '@nestjs/config';

interface SepayTransactionItem {
  id: string | number;
  bank_brand_name?: string;
  account_number?: string;
  transaction_date?: string;
  amount_in?: string | number;
  amount_out?: string | number;
  transaction_content?: string;
  reference_number?: string;
  code?: string | null;
}

interface SepayTransactionsResponse {
  status?: number;
  messages?: string[];
  transactions?: SepayTransactionItem[];
}

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name);
  private isPolling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Processes SePay IPN webhook notification, extracts orderCode,
   * updates Order payment status directly, and returns the resulting status.
   */
  async processWebhook(
    dto: SepayWebhookDto,
  ): Promise<SepayWebhookResponseModel> {
    this.logger.log(
      `Received SePay IPN webhook notification: ID=${dto.id}, amount=${dto.transferAmount}, content="${dto.content}"`,
    );

    // Extract orderCode from dto.code or dto.content (e.g. "CG592489")
    const extractedOrderCode = this.extractOrderCode(dto.code, dto.content);

    if (!extractedOrderCode) {
      this.logger.warn(
        `Could not extract order code from SePay payload content: "${dto.content}"`,
      );
      return {
        orderCode: null,
        orderStatus: PaymentStatus.PENDING,
        message: 'Webhook received, but no order code found in transaction content',
      };
    }

    // Look up Order in database
    const order = await this.prisma.order.findUnique({
      where: { orderCode: extractedOrderCode },
    });

    if (!order) {
      this.logger.warn(`Order with code "${extractedOrderCode}" not found in database`);
      return {
        orderCode: extractedOrderCode,
        orderStatus: PaymentStatus.PENDING,
        message: `Webhook received, but order ${extractedOrderCode} was not found`,
      };
    }

    // Process inbound successful payment
    if (
      dto.transferType === 'in' &&
      Number(dto.transferAmount) >= Number(order.amount)
    ) {
      await this.markOrderAsCompleted(order.id, order.orderCode);

      return {
        orderCode: order.orderCode,
        orderStatus: PaymentStatus.COMPLETED,
        message: `Payment completed successfully for order ${order.orderCode}`,
      };
    }

    return {
      orderCode: order.orderCode,
      orderStatus: order.status,
      message: `Webhook processed. Inbound amount (${dto.transferAmount}) did not satisfy order amount (${order.amount})`,
    };
  }

  /**
   * Background task running every 8 seconds to poll SePay API for pending orders
   * until their status is changed from PENDING.
   */
  @Interval(8000)
  async pollPendingOrdersFromSepay(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    const apiUrl = this.config.getOrThrow<string>(SEPAY_CONFIG.apiUrl);
    const apiKey = this.config.getOrThrow<string>(SEPAY_CONFIG.apiKey);

    this.isPolling = true;

    try {
      // 1. Fetch pending orders from DB
      const pendingOrders = await this.prisma.order.findMany({
        where: { status: PaymentStatus.PENDING },
        select: { id: true, orderCode: true, amount: true },
      });

      if (pendingOrders.length === 0) {
        return;
      }

      // 2. Query SePay API for recent transactions
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        this.logger.warn(`Failed to fetch transactions from SePay API: HTTP ${res.status}`);
        return;
      }

      const body = (await res.json()) as SepayTransactionsResponse;
      const transactions = body.transactions ?? [];

      if (transactions.length === 0) {
        return;
      }

      // 3. Match transactions with pending orders
      for (const order of pendingOrders) {
        const matchingTx = transactions.find((tx) => {
          const codeMatch =
            tx.code && tx.code.toUpperCase() === order.orderCode.toUpperCase();
          const contentMatch =
            tx.transaction_content &&
            tx.transaction_content
              .toUpperCase()
              .includes(order.orderCode.toUpperCase());
          const amountIn = Number(tx.amount_in ?? 0);

          return (codeMatch || contentMatch) && amountIn >= Number(order.amount);
        });

        if (matchingTx) {
          await this.markOrderAsCompleted(
            order.id,
            order.orderCode,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Error during SePay API pending order polling: ${err}`);
    } finally {
      this.isPolling = false;
    }
  }

  private async markOrderAsCompleted(
    orderId: string,
    orderCode: string,
  ): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: PaymentStatus.COMPLETED },
    });

    this.logger.log(`Successfully completed order ${orderCode}`);
  }

  private extractOrderCode(
    code: string | null,
    content: string,
  ): string | null {
    if (code && /^CG\d+/i.test(code)) {
      return code.toUpperCase();
    }

    const match = content.match(/CG\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }

    return code ?? null;
  }
}
