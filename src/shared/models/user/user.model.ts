import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../prisma/prisma-client';

/**
 * Public-safe representation of a user (never exposes the password hash).
 *
 * Lives in the shared library so any consumer — controllers, other
 * services, or a future standalone package — describes users the same way.
 */
export class UserModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 'gaben' })
  username: string;

  @ApiProperty({ example: 'user@centrix.dev' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role: Role;
}
