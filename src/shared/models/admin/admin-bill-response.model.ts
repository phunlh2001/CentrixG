import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BillProductInfoModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ nullable: true, example: 570 })
  appId: number | null;

  @ApiProperty({ example: 'Dota 2' })
  name: string;

  @ApiProperty({ nullable: true, example: 'https://cdn.example.com/dota2.jpg' })
  imageUrl: string | null;
}

export class BillUserInfoModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 'gabe.newell' })
  username: string;

  @ApiProperty({ example: 'gabe@valvesoftware.com' })
  email: string;
}

export class BillReferrerInfoModel {
  @ApiProperty({ example: 'ref-uuid' })
  id: string;

  @ApiProperty({ example: 'streamer_pro' })
  username: string;

  @ApiProperty({ example: 'streamer@centrix.dev' })
  email: string;

  @ApiProperty({ nullable: true, example: 'STREAM2026' })
  code?: string | null;
}

export class BillPaymentAmountModel {
  @ApiProperty({ example: 250000, description: 'Amount in VND' })
  vnd: number;

  @ApiProperty({ example: 10.0, description: 'Amount in USD' })
  usd: number;

  @ApiProperty({ example: 71.43, description: 'Amount in CNY' })
  cny: number;
}

export class AdminBillItemModel {
  @ApiProperty({ example: 'CG592489', description: 'BILL ID' })
  id: string;

  @ApiProperty({
    type: [BillProductInfoModel],
    description: 'LIST OF PRODUCTS IN ORDER',
  })
  products: BillProductInfoModel[];

  @ApiProperty({ type: BillUserInfoModel, description: 'USER ACCOUNT' })
  userAccount: BillUserInfoModel;

  @ApiProperty({
    type: BillReferrerInfoModel,
    nullable: true,
    description: 'REFERRER INFO',
  })
  referrerInfo: BillReferrerInfoModel | null;

  @ApiPropertyOptional({
    example: 'PENDING',
    description: 'ORDER STATUS',
  })
  orderStatus?: string;

  @ApiProperty({
    type: BillPaymentAmountModel,
    description: 'PAYMENT AMOUNT (VND / USD / CNY)',
  })
  paymentAmount: BillPaymentAmountModel;

  @ApiProperty({ description: 'DATE & TIME' })
  createdAt: Date | string;
}

export class AdminBillPaginatedResponseModel {
  @ApiProperty({ type: [AdminBillItemModel] })
  items: AdminBillItemModel[];

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
