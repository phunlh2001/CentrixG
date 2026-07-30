import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateManifestDto } from './create-manifest.dto';

export class CreateManyManifestsDto {
  @ApiProperty({ type: [CreateManifestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateManifestDto)
  manifests: CreateManifestDto[];
}
