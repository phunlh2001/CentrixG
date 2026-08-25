import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum RoleUpdateType {
  PROMOTE = 'promote',
  DEMOTE = 'demote',
}

export class UpdateUserRoleQueryDto {
  @ApiProperty({
    enum: RoleUpdateType,
    description: "Action type: 'promote' (CUSTOMER -> SELLER) or 'demote' (SELLER -> CUSTOMER)",
    example: RoleUpdateType.PROMOTE,
  })
  @IsNotEmpty()
  @IsEnum(RoleUpdateType, {
    message: "Query parameter 'type' must be either 'promote' or 'demote'",
  })
  type: RoleUpdateType;
}

export class UpdateUserRoleDto {
  @ApiProperty({
    example: '9c1f7b8a-3d2e-4f1a-8c5b-6a7b8c9d0e1f',
    description: 'Target user ID to promote or demote',
  })
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  userId: string;
}
