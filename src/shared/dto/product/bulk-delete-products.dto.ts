import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteProductsDto {
  @ApiProperty({
    type: [String],
    example: ['9c1f...uuid1', '9c1f...uuid2'],
    description: 'Array of product UUIDs to permanently hard-delete',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'productIds array cannot be empty' })
  @IsUUID('4', { each: true, message: 'Each productId must be a valid UUID' })
  productIds: string[];
}
