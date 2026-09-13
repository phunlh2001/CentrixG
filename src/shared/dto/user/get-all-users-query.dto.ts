import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetAllUsersQueryDto {
  @ApiPropertyOptional({
    example: 9,
    description:
      'Optional month (1-12) to calculate seller commission totalEarn for that specific month',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (
      value === '' ||
      value === null ||
      value === undefined ||
      value === 'null' ||
      value === 'undefined'
    ) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    example: 2026,
    description:
      'Optional year (e.g. 2026) for monthly calculation (defaults to current year)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (
      value === '' ||
      value === null ||
      value === undefined ||
      value === 'null' ||
      value === 'undefined'
    ) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsInt()
  @Min(2020)
  year?: number;
}
