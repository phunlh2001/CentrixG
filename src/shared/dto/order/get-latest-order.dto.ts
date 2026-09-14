import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class GetLatestOrderQueryDto {
  @ApiPropertyOptional({
    example: 100000,
    description: 'Total amount of items in current cart to verify against pending order',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @IsPositive()
  totalAmount?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of items in current cart to verify against pending order products count',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsInt()
  @Min(1)
  length?: number;
}
