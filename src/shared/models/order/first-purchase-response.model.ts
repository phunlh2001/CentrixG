import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FirstPurchaseResponseModel {
  @ApiProperty({
    example: true,
    description: 'True if current authenticated user has never completed an order',
  })
  isFirstPurchase: boolean;

  @ApiPropertyOptional({
    example: 'AAAA1111BBBB2222',
    description: 'Referral offer code permanently bound to this customer (null if none)',
    nullable: true,
  })
  usedOfferCode?: string | null;
}

