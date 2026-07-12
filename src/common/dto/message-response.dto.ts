import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic acknowledgement payload for operations that return no entity.
 */
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

/**
 * Payload for bulk operations reporting how many rows were affected.
 */
export class BulkResultDto {
  @ApiProperty({ example: 12, description: 'Number of affected records' })
  count: number;

  @ApiProperty({ example: 'Products created successfully' })
  message: string;
}
