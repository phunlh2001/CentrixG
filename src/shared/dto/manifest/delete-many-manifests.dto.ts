import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class DeleteManyManifestsDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['9c1f...uuid1', '9c1f...uuid2'],
    description: 'List of manifest UUID record IDs to soft delete',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  @ApiPropertyOptional({
    type: [Number],
    example: [570, 730],
    description: 'List of Steam AppIDs whose manifests should be soft deleted',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  appIds?: number[];
}
