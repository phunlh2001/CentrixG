import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteManyProductsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Product ids to soft-delete (set invisible = true).',
    example: ['9c1f...uuid', 'a2b3...uuid'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}
