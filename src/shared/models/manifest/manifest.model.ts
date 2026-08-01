import { ApiProperty } from '@nestjs/swagger';

export class ManifestModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 570 })
  appId: number;

  @ApiProperty({ nullable: true, example: '{"depots": ...}' })
  manifestData: Uint8Array<ArrayBuffer> | null;

  @ApiProperty({ nullable: true, example: 'addappid(570, 1, "key")' })
  luaScript: string | null;

  @ApiProperty({ example: true, description: 'True if manifest is enabled (not soft deleted)' })
  isEnabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
