import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SepayWebhookDto,
  SepayWebhookResponseModel,
} from '@app/shared';
import { PaymentStatus } from '../../prisma/prisma-client';

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processes SePay IPN webhook notification, extracts orderCode,
   * updates Order & Bill payment status, and returns the resulting status.
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
        billStatus: PaymentStatus.PENDING,
        message: 'Webhook received, but no order code found in transaction content',
      };
    }

    // Look up Order in database
    const order = await this.prisma.order.findUnique({
      where: { orderCode: extractedOrderCode },
      include: { bill: true },
    });

    if (!order) {
      this.logger.warn(`Order with code "${extractedOrderCode}" not found in database`);
      return {
        orderCode: extractedOrderCode,
        billStatus: PaymentStatus.PENDING,
        message: `Webhook received, but order ${extractedOrderCode} was not found`,
      };
    }

    // Process inbound successful payment
    if (
      dto.transferType === 'in' &&
      Number(dto.transferAmount) >= Number(order.amount)
    ) {
      await this.prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: { status: PaymentStatus.COMPLETED },
        });

        // Update bill status if linked
        if (order.billId) {
          await tx.bill.update({
            where: { id: order.billId },
            data: { status: PaymentStatus.COMPLETED },
          });
        }
      });

      this.logger.log(`Successfully completed order ${order.orderCode} via SePay IPN`);

      return {
        orderCode: order.orderCode,
        billStatus: PaymentStatus.COMPLETED,
        message: `Payment completed successfully for order ${order.orderCode}`,
      };
    }

    return {
      orderCode: order.orderCode,
      billStatus: order.status,
      message: `Webhook processed. Inbound amount (${dto.transferAmount}) did not satisfy order amount (${order.amount})`,
    };
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
