import { ApiProperty } from '@nestjs/swagger';

export class FirstPurchaseResponseModel {
  @ApiProperty({
    example: true,
    description: 'True if current authenticated user has never completed an order',
  })
  isFirstPurchase: boolean;
}
