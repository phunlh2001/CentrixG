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
}
