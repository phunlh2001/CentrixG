import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum PriceSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ProductMode {
  WAREHOUSE = 'warehouse',
  PRODUCT = 'product',
  STOREFRONT = 'storefront',
  TRASH = 'trash'
}

/**
 * Query parameters for listing products across Storefront, Product Management, and Warehouse.
 */
export class QueryProductDto {
  @ApiPropertyOptional({
    description:
      'Multi-language / UTF-8 / Hanzi case-insensitive search (name, description, developer, publisher, appId, category)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return decodeURIComponent(value).trim();
    } catch {
      return value.trim();
    }
  })
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    description:
      'Number of products per page. If null or omitted, returns all matching products unpaginated.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by mode: "warehouse", "product", "trash" or "storefront"',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value.trim();
  })
  @IsEnum(ProductMode, {
    message: 'mode must be either "warehouse", "product", "trash" or "storefront"',
  })
  mode?: ProductMode = ProductMode.STOREFRONT;

  @ApiPropertyOptional({
    enum: PriceSortOrder,
    description: 'Order products by VND price ("asc" or "desc")',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEnum(PriceSortOrder, {
    message: 'orderByPrice must be either "asc" or "desc"',
  })
  orderByPrice?: PriceSortOrder;

  @ApiPropertyOptional({ description: 'Sort by newest (updatedAt: desc)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  newest?: boolean = false;
}
