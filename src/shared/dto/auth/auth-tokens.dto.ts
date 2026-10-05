import { ApiProperty } from '@nestjs/swagger';

/**
 * Response returned by login, register and refresh operations.
 * User profile information is embedded directly within the JWT access token.
 */
export class AuthTokensDto {
  @ApiProperty({ description: 'Short-lived JWT access token containing embedded user and affiliate profile' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque long-lived refresh token' })
  refreshToken: string;

  @ApiProperty({
    example: 1296000,
    description: 'Access-token lifetime in seconds (15 days = 1,296,000s)',
  })
  expiresIn: number;
}
