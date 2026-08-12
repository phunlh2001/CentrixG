import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../../../prisma/prisma-client';

export class SepayWebhookResponseModel {
  @ApiProperty({ example: 'CG592489', nullable: true })
  orderCode: string | null;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETED })
  billStatus: PaymentStatus;

  @ApiProperty({ example: 'Payment processed successfully' })
  message: string;
}
