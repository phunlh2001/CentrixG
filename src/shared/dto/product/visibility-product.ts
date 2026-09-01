import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class VisibilityProductDto {
  @ApiProperty({
    description: 'Visibility status (true = visible, false = hidden)',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  })
  @IsBoolean()
  value: boolean;
}