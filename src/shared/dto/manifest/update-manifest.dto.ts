import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateManifestDto {
  @ApiPropertyOptional({
    example: 'https://example.com/manifests/570.json',
    description: 'URL to download or access manifest file',
  })
  @IsOptional()
  @IsString()
  manifestUrl?: string;
}
