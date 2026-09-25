import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StorageProvider } from '../../enums/storage-provider.enum';

export class ManifestStorageQueryDto {
  @ApiPropertyOptional({
    enum: StorageProvider,
    description: 'Storage provider to use (r2 or supabase). Defaults to r2 for uploads.',
    example: StorageProvider.R2,
  })
  @IsOptional()
  @IsEnum(StorageProvider)
  storage?: StorageProvider;
}
