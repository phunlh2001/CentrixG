import { ApiProperty } from '@nestjs/swagger';

/**
 * Complete pricing for a product, keyed by currency. Every product exposes
 * all supported currencies; a currency Steam did not provide reads `"0"`.
 *
 * Amounts are serialized as strings to preserve exact monetary precision
 * (they map to SQL Decimal). Add a new currency here when the `Currency`
 * enum grows.
 */
export class PricingModel {
  @ApiProperty({ example: '299000.0000', description: 'Vietnamese đồng' })
  vnd: string;

  @ApiProperty({ example: '11.9900', description: 'US dollar' })
  usd: string;

  @ApiProperty({ example: '89.0000', description: 'Chinese yuan' })
  cny: string;
}
