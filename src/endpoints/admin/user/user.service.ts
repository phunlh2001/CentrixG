import { PrismaService } from '@app/prisma/prisma.service';
import { MailService } from '@app/services/mail/mail.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BanUserDto,
  GetAllUsersQueryDto,
  RoleUpdateType,
  UpdateUserRoleDto,
  UpdateUserRoleQueryDto,
  UserAccountModel,
} from '@app/shared';
import { PaymentStatus, Role } from '@app/generated/prisma/enums';
import { generateOfferCode } from '../../../common/utils/code-generator.util';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Retrieves all registered user accounts for Admin and Mod management.
   * If month (or year) is provided, calculates totalEarn commission for each seller within that specific timeframe.
   * If month and year are null, empty, or omitted, responds with the full "totalEarn" without specific time boundaries.
   */
  async getAllUsers(query?: GetAllUsersQueryDto): Promise<UserAccountModel[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { notIn: [Role.ADMIN, Role.MOD] } },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBlock: true,
        resonable: true,
        offerCode: true,
        totalEarn: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const sellerIds = users
      .filter((u) => u.role === Role.SELLER)
      .map((u) => u.id);

    const hasMonth =
      query?.month !== undefined &&
      query?.month !== null &&
      !isNaN(Number(query.month)) &&
      Number(query.month) >= 1 &&
      Number(query.month) <= 12;

    const hasYear =
      query?.year !== undefined &&
      query?.year !== null &&
      !isNaN(Number(query.year)) &&
      Number(query.year) >= 2000;

    // If month or year is specified, calculate commission earned within that specific timeframe
    if (hasMonth || hasYear) {
      let startDate: Date;
      let endDate: Date;

      if (hasMonth) {
        const year = hasYear ? Number(query!.year) : new Date().getFullYear();
        const month = Number(query!.month);
        startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        const year = Number(query!.year);
        startDate = new Date(year, 0, 1, 0, 0, 0, 0);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }

      const timeframeEarningsMap = new Map<string, number>();

      if (sellerIds.length > 0) {
        const timeframeOrders = await this.prisma.order.groupBy({
          by: ['sellerId'],
          where: {
            sellerId: { in: sellerIds },
            status: PaymentStatus.COMPLETED,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            commissionAmount: true,
          },
        });

        for (const item of timeframeOrders) {
          if (item.sellerId) {
            timeframeEarningsMap.set(
              item.sellerId,
              Number(item._sum.commissionAmount ?? 0),
            );
          }
        }
      }

      return users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        isBlock: u.isBlock,
        resonable: u.resonable,
        offerCode: u.offerCode,
        totalEarn:
          u.role === Role.SELLER
            ? (timeframeEarningsMap.get(u.id) ?? 0)
            : null,
        createdAt: u.createdAt,
      }));
    }

    // When month and year are null, empty, or omitted: response full "totalEarn" without specific time
    const allTimeEarningsMap = new Map<string, number>();

    if (sellerIds.length > 0) {
      const allTimeOrders = await this.prisma.order.groupBy({
        by: ['sellerId'],
        where: {
          sellerId: { in: sellerIds },
          status: PaymentStatus.COMPLETED,
        },
        _sum: {
          commissionAmount: true,
        },
      });

      for (const item of allTimeOrders) {
        if (item.sellerId) {
          allTimeEarningsMap.set(
            item.sellerId,
            Number(item._sum.commissionAmount ?? 0),
          );
        }
      }
    }

    return users.map((u) => {
      let totalEarn: number | null = null;
      if (u.role === Role.SELLER) {
        const userTotalEarn = Number(u.totalEarn ?? 0);
        const orderTotalEarn = allTimeEarningsMap.get(u.id) ?? 0;
        totalEarn = Math.max(userTotalEarn, orderTotalEarn);
      }

      return {
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        isBlock: u.isBlock,
        resonable: u.resonable,
        offerCode: u.offerCode,
        totalEarn,
        createdAt: u.createdAt,
      };
    });
  }

  /**
   * Bans or unbans a user account by setting isBlock and resonable.
   * If user is blocked, revokes all active session tokens immediately
   * and sends an account suspension email notification.
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
        offerCode: true,
        totalEarn: true,
        createdAt: true,
      },
    });

    // If account was blocked, revoke active authentication session tokens
    if (isBlock) {
      await this.prisma.token.deleteMany({
        where: { userId: dto.userId },
      });

      try {
        await this.mailService.sendAccountSuspensionEmail(
          user.email,
          user.username,
          resonable ?? 'Account blocked by Admin/Mod',
        );
      } catch (mailError) {
        this.logger.error(
          `Failed to dispatch account suspension email for user ${user.id}:`,
          mailError,
        );
      }
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      isBlock: updatedUser.isBlock,
      resonable: updatedUser.resonable,
      offerCode: updatedUser.offerCode,
      totalEarn: updatedUser.role === Role.SELLER ? Number(updatedUser.totalEarn) : null,
      createdAt: updatedUser.createdAt,
    };
  }

  /**
   * Promotes or demotes user role between CUSTOMER and SELLER.
   * - type = 'promote': CUSTOMER -> SELLER (generates unique 12-character offerCode, totalEarn initialized to 0)
   * - type = 'demote': SELLER -> CUSTOMER (nullifies offerCode, totalEarn reset to 0)
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
    let offerCode: string | null = user.offerCode;
    let totalEarn = user.totalEarn;

    if (query.type === RoleUpdateType.PROMOTE) {
      if (user.role === Role.SELLER) {
        throw new BadRequestException('User is already a SELLER');
      }
      if (user.role !== Role.CUSTOMER) {
        throw new BadRequestException(`Cannot promote user with role ${user.role}`);
      }
      targetRole = Role.SELLER;

      // If user already had an offerCode from previous seller tenure, reuse it!
      // Otherwise, generate a unique 12-character offerCode
      if (!offerCode) {
        let code = generateOfferCode();
        let attempts = 0;
        while (attempts < 10) {
          const existing = await this.prisma.user.findUnique({
            where: { offerCode: code },
          });
          if (!existing) break;
          code = generateOfferCode();
          attempts++;
        }
        offerCode = code;
      }
    } else if (query.type === RoleUpdateType.DEMOTE) {
      if (user.role === Role.CUSTOMER) {
        throw new BadRequestException('User is already a CUSTOMER');
      }
      if (user.role !== Role.SELLER) {
        throw new BadRequestException(`Cannot demote user with role ${user.role}`);
      }
      targetRole = Role.CUSTOMER;
      // Do NOT nullify offerCode: preserve user.offerCode in database so it is retained!
      offerCode = user.offerCode;
    } else {
      throw new BadRequestException(
        "Invalid action type. Expected 'promote' or 'demote'",
      );
    }


    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: {
        role: targetRole,
        offerCode,
        totalEarn,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isBlock: true,
        resonable: true,
        offerCode: true,
        totalEarn: true,
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
      offerCode: updatedUser.offerCode,
      totalEarn: updatedUser.role === Role.SELLER ? Number(updatedUser.totalEarn) : null,
      createdAt: updatedUser.createdAt,
    };
  }
}
