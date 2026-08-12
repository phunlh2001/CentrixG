import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../../../prisma/prisma-client';

export class OrderStatusResponseModel {
  @ApiProperty({ example: 'CG592489' })
  orderCode: string;

  @ApiProperty({ example: 100000 })
  amount: number;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({
    enum: PaymentStatus,
    nullable: true,
    example: PaymentStatus.PENDING,
  })
  billStatus: PaymentStatus | null;

  @ApiProperty()
  createdAt: Date;
}
