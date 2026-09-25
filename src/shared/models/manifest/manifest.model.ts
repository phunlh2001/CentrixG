import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProvider } from '../../enums/storage-provider.enum';

export class ManifestModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 570, description: 'Steam AppID' })
  appId: number;

  @ApiProperty({ example: 'Dota 2', description: 'Product name associated with Steam AppID' })
  name: string;

  @ApiProperty({
    nullable: true,
    example: 'https://example.com/manifests/570.json',
    description: 'URL to download or access manifest file',
  })
  manifestUrl: string | null;

  @ApiPropertyOptional({
    enum: StorageProvider,
    example: StorageProvider.R2,
    description: 'Storage provider where the manifest is stored (r2 or supabase)',
  })
  storage?: StorageProvider;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
