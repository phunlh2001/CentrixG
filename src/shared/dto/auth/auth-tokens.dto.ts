import { ApiProperty } from '@nestjs/swagger';
import { UserModel } from '../../models/user';

/**
 * Response returned by login, register and refresh operations.
 */
export class AuthTokensDto {
  @ApiProperty({ description: 'Short-lived JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque long-lived refresh token' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access-token lifetime (seconds)' })
  expiresIn: number;

  @ApiProperty({ type: UserModel })
  user: UserModel;
}
