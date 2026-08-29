import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 100000, description: 'Order amount in VND' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    type: [String],
    example: [
      'aef481a7-97d9-4f65-a829-e10288d09d88',
      'bce182c8-88e8-4e54-b718-d09187c09e77',
    ],
    description: 'List of product IDs to purchase in this order (at least 1 required)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least 1 product' })
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID' })
  @IsString({ each: true })
  productIds: string[];
}
