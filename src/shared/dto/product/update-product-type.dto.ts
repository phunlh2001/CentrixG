import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateProductTypeDto {
  @ApiProperty({
    example: 'Rockstar',
    description: 'Name of the product type / category (e.g. Rockstar, Ubisoft, EA)',
  })
  @IsString()
  category: string;
}
