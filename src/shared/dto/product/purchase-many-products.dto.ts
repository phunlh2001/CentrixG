import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class PurchaseManyProductsDto {
  @ApiProperty({
    type: [String],
    example: ['9c1f...uuid1', '9c1f...uuid2'],
    description: 'Array of product UUIDs to purchase in a single bulk transaction',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];
}
