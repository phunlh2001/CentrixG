import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../prisma/prisma-client';

export class UserAccountModel {
  @ApiProperty({ example: '9c1f7b8a-3d2e-4f1a-8c5b-6a7b8c9d0e1f' })
  id: string;

  @ApiProperty({ example: 'player1@centrix.dev' })
  email: string;

  @ApiProperty({ example: 'player_one' })
  username: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role: Role;

  @ApiProperty({ example: false, description: 'True if user account is banned/blocked' })
  isBlock: boolean;

  @ApiProperty({
    nullable: true,
    example: 'Violation of platform terms of service',
    description: 'Reason for ban/block (null if not blocked)',
  })
  resonable: string | null;

  @ApiProperty({ example: '2026-08-20T10:00:00.000Z' })
  createdAt: Date | string;
}
