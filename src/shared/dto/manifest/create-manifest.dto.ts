import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateManifestDto {
  @ApiProperty({ example: 570, description: 'Steam AppID' })
  @IsInt()
  @Min(1)
  appId: number;

  @ApiPropertyOptional({ example: 571, description: 'Steam Depot ID' })
  @IsOptional()
  @IsInt()
  depotId?: number;

  @ApiPropertyOptional({
    example: '1234567890123456789',
    description: 'Steam Manifest ID',
  })
  @IsOptional()
  @IsString()
  manifestId?: string;

  @ApiPropertyOptional({
    example: '{"depots": ...}',
    description: 'Encrypted or JSON manifest payload',
  })
  @IsOptional()
  @IsString()
  manifestData?: string;

  @ApiPropertyOptional({
    example: 'addappid(570, 1, "key")',
    description: 'Lua script content for Steam unlocker tool',
  })
  @IsOptional()
  @IsString()
  luaScript?: string;

  @ApiPropertyOptional({ example: 1, description: 'Manifest version number' })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiPropertyOptional({ example: true, description: 'Is manifest enabled' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
