import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Query parameters for listing products. `includeHidden` is honored only
 * for admins (enforced in the controller/service).
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

  @ApiPropertyOptional({
    default: false,
    description: 'Admins only: include soft-deleted (invisible) products.',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeHidden?: boolean = false;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Has manifest' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hasManifest?: boolean = true;
}
