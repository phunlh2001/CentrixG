import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../prisma/prisma-client';
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

  @ApiPropertyOptional({
    enum: Role,
    example: Role.CUSTOMER,
    description: 'Role of the authenticated user (CUSTOMER, SELLER, MOD, ADMIN)',
  })
  role?: Role;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Total commission earned in VND',
  })
  totalEarn?: number;

  @ApiProperty({ type: UserModel })
  user: UserModel;
}
