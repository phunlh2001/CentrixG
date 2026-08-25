import { PrismaService } from '@app/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BanUserDto,
  RoleUpdateType,
  UpdateUserRoleDto,
  UpdateUserRoleQueryDto,
  UserAccountModel,
} from '@app/shared';
import { Role } from '@app/generated/prisma/enums';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all registered user accounts for Admin and Mod management.
   */
  async getAllUsers(): Promise<UserAccountModel[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { notIn: [Role.ADMIN, Role.MOD] } },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBlock: true,
        resonable: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      isBlock: u.isBlock,
      resonable: u.resonable,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Bans or unbans a user account by setting isBlock and resonable.
   * If user is blocked, revokes all active session tokens immediately.
   */
  async banUser(dto: BanUserDto): Promise<UserAccountModel> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const isBlock = dto.isBlock !== undefined ? dto.isBlock : true;
    const resonable = isBlock
      ? (dto.reason ?? 'Account blocked by Admin/Mod')
      : null;

    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: {
        isBlock,
        resonable,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBlock: true,
        resonable: true,
        createdAt: true,
      },
    });

    // If account was blocked, revoke active authentication session tokens
    if (isBlock) {
      await this.prisma.token.deleteMany({
        where: { userId: dto.userId },
      });
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      isBlock: updatedUser.isBlock,
      resonable: updatedUser.resonable,
      createdAt: updatedUser.createdAt,
    };
  }

  /**
   * Promotes or demotes user role between CUSTOMER and SELLER.
   * - type = 'promote': CUSTOMER -> SELLER
   * - type = 'demote': SELLER -> CUSTOMER
   */
  async updateUserRole(
    dto: UpdateUserRoleDto,
    query: UpdateUserRoleQueryDto,
  ): Promise<UserAccountModel> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    if (user.role === Role.ADMIN || user.role === Role.MOD) {
      throw new BadRequestException('Cannot modify the role of ADMIN or MOD accounts');
    }

    let targetRole: Role;

    if (query.type === RoleUpdateType.PROMOTE) {
      if (user.role === Role.SELLER) {
        throw new BadRequestException('User is already a SELLER');
      }
      if (user.role !== Role.CUSTOMER) {
        throw new BadRequestException(`Cannot promote user with role ${user.role}`);
      }
      targetRole = Role.SELLER;
    } else if (query.type === RoleUpdateType.DEMOTE) {
      if (user.role === Role.CUSTOMER) {
        throw new BadRequestException('User is already a CUSTOMER');
      }
      if (user.role !== Role.SELLER) {
        throw new BadRequestException(`Cannot demote user with role ${user.role}`);
      }
      targetRole = Role.CUSTOMER;
    } else {
      throw new BadRequestException(
        "Invalid action type. Expected 'promote' or 'demote'",
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { role: targetRole },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBlock: true,
        resonable: true,
        createdAt: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      isBlock: updatedUser.isBlock,
      resonable: updatedUser.resonable,
      createdAt: updatedUser.createdAt,
    };
  }
}
