import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderResponseModel {
  @ApiProperty({ example: 'CG592489' })
  orderCode: string;

  @ApiProperty({ example: 100000 })
  amount: number;

  @ApiProperty({ example: '0111000373824' })
  accountNumber: string;

  @ApiProperty({ example: 'LE THANH TUNG' })
  accountName: string;

  @ApiProperty({ example: 'Vietcombank' })
  bankName: string;

  @ApiProperty({
    example:
      'https://img.vietqr.io/image/Vietcombank-0111000373824-compact.png?amount=100000&addInfo=CG592489&accountName=LE%20THANH%20TUNG',
  })
  qrCodeUrl: string;

  @ApiProperty({
    example: 900,
    description: 'Remaining expiration time left in seconds',
  })
  expired: number;

  @ApiProperty({
    example: 'aef481a7-97d9-4f65-a829-e10288d09d88',
    description: 'Linked product ID for this order',
  })
  productId: string;
}
