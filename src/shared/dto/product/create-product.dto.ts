import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateDlcDto } from './create-dlc.dto';
import { PricingDto } from './pricing.dto';

export class CreateProductDto {
  @ApiProperty({ example: 570, description: 'Unique Steam AppID' })
  @IsInt()
  @IsPositive()
  appId: number;

  @ApiProperty({ example: 'Dota 2' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'A competitive game of action and strategy.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/dota2.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    type: PricingDto,
    description:
      'Prices per currency. Omitted currencies default to 0; all supported ' +
      'currencies are persisted.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto;

  @ApiPropertyOptional({
    example: '2013-07-09T00:00:00.000Z',
    description: 'ISO-8601 release date',
  })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ example: 'Valve' })
  @IsOptional()
  @IsString()
  developer?: string;

  @ApiPropertyOptional({ example: 'Valve' })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Category names associated with the product.',
    example: ['Action', 'Strategy', 'Single-player'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  categories?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['windows', 'mac', 'linux'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  platforms?: string[];

  @ApiPropertyOptional({
    type: [CreateDlcDto],
    description: 'DLCs to create alongside the product.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDlcDto)
  dlcs?: CreateDlcDto[];
}
