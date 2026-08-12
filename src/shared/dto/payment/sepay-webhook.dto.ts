import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SepayWebhookDto {
  @ApiProperty({ example: 123456 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString()
  gateway: string;

  @ApiProperty({ example: '2026-08-12 10:00:00' })
  @IsString()
  transactionDate: string;

  @ApiProperty({ example: '0111000373824' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ nullable: true, example: 'CG592489' })
  @IsOptional()
  @IsString()
  code: string | null;

  @ApiProperty({ example: 'CG592489' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'in', description: 'Transfer type: in or out' })
  @IsString()
  transferType: 'in' | 'out';

  @ApiProperty({ example: 100000 })
  @IsNumber()
  transferAmount: number;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  accumulated: number;

  @ApiPropertyOptional({ nullable: true, example: null })
  @IsOptional()
  @IsString()
  subAccount: string | null;

  @ApiProperty({ example: 'FT242250001' })
  @IsString()
  referenceCode: string;

  @ApiProperty({ example: 'Thanh toan don hang CG592489' })
  @IsString()
  description: string;
}
