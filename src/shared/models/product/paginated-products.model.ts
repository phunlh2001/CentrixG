import { ApiProperty } from '@nestjs/swagger';
import { ProductModel } from './product.model';

/**
 * A page of products plus pagination metadata.
 */
export class PaginatedProductsModel {
  @ApiProperty({ type: [ProductModel] })
  items: ProductModel[];

  @ApiProperty({ example: 123 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 7 })
  totalPages: number;
}
