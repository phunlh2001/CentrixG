import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@app/generated/prisma/enums';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import {
  BanUserDto,
  UpdateUserRoleDto,
  UpdateUserRoleQueryDto,
  UserAccountModel,
} from '@app/shared';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MOD)
@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all user accounts (ADMIN and MOD only)',
    description:
      'Returns a list of all user accounts containing email, role, isBlock, resonable, and createdAt.',
  })
  @ApiOkResponse({
    type: [UserAccountModel],
    description: 'List of all registered user accounts',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MOD role',
  })
  getAllUsers(): Promise<UserAccountModel[]> {
    return this.userService.getAllUsers();
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ban or unban user account (ADMIN and MOD only)',
    description:
      'Updates the isBlock and resonable fields for the target user. If blocked, active sessions are immediately terminated.',
  })
  @ApiOkResponse({
    type: UserAccountModel,
    description: 'Updated user account record',
  })
  @ApiNotFoundResponse({ description: 'Target user not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MOD role',
  })
  banUser(@Body() dto: BanUserDto): Promise<UserAccountModel> {
    return this.userService.banUser(dto);
  }

  @Patch('role/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Promote or demote user role (ADMIN and MOD only)',
    description:
      "Updates user role: query 'type=promote' changes CUSTOMER to SELLER, 'type=demote' changes SELLER to CUSTOMER.",
  })
  @ApiOkResponse({
    type: UserAccountModel,
    description: 'Updated user account record with new role',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid role transition, user already has target role, or target is ADMIN/MOD',
  })
  @ApiNotFoundResponse({ description: 'Target user not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({
    description: 'Forbidden: Requires ADMIN or MOD role',
  })
  updateUserRole(
    @Body() dto: UpdateUserRoleDto,
    @Query() query: UpdateUserRoleQueryDto,
  ): Promise<UserAccountModel> {
    return this.userService.updateUserRole(dto, query);
  }
}
