import { ApiProperty } from '@nestjs/swagger';

/**
 * Public-safe representation of a stored refresh token. The token value
 * itself is intentionally omitted from this model so it is never leaked
 * through listing endpoints.
 */
export class TokenModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: '2026-07-12T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-07-19T00:00:00.000Z' })
  expiredAt: Date;

  @ApiProperty({ example: '2c22...uuid', description: 'Owning user id' })
  userId: string;
}
