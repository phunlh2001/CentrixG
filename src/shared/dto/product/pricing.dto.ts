import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Multi-currency price input. Any omitted currency defaults to 0, so every
 * product ends up with a value for all supported currencies. Add a field
 * here when the `Currency` enum grows.
 */
export class PricingDto {
  @ApiPropertyOptional({ example: 299000, default: 0, description: 'VND' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  vnd?: number = 0;

  @ApiPropertyOptional({ example: 11.99, default: 0, description: 'USD' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  usd?: number = 0;

  @ApiPropertyOptional({ example: 89, default: 0, description: 'CNY' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cny?: number = 0;
}
