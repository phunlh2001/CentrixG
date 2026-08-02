import { ApiProperty } from '@nestjs/swagger';

export class ManifestModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 570, description: 'Steam AppID' })
  appId: number;

  @ApiProperty({
    nullable: true,
    example: 'https://example.com/manifests/570.json',
    description: 'URL to download or access manifest file',
  })
  manifestUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
