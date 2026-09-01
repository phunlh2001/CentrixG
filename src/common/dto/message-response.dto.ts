import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic acknowledgement payload for operations that return no entity.
 */
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
