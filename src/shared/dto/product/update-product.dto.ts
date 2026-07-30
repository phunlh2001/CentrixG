import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

/**
 * All CreateProductDto fields (except `dlcs`, which are managed separately)
 * become optional. Additionally exposes the `invisible` flag so an admin can
 * hide/unhide a product directly. When `pricing` is provided, only the
 * supplied currencies are updated.
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['dlcs'] as const),
) {
  @ApiPropertyOptional({
    example: false,
    description: 'Soft-delete flag. true hides the product from customers.',
  })
  @IsOptional()
  @IsBoolean()
  invisible?: boolean;
}
