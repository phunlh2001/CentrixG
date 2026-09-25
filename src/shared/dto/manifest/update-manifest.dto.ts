import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StorageProvider } from '../../enums/storage-provider.enum';

export class UpdateManifestDto {
  @ApiPropertyOptional({
    example: 'https://example.com/manifests/570.json',
    description: 'URL to download or access manifest file',
  })
  @IsOptional()
  @IsString()
  manifestUrl?: string;

  @ApiPropertyOptional({
    enum: StorageProvider,
    example: StorageProvider.R2,
    description: 'Storage provider associated with manifest file (r2 or supabase)',
  })
  @IsOptional()
  @IsEnum(StorageProvider)
  storage?: StorageProvider;
}
