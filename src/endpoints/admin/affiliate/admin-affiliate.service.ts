import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../../services/mail/mail.service';
import {
  AdminAffiliateListItemModel,
  AdminAffiliatePaginatedResponseModel,
  AffiliateModel,
  AffiliateStatus,
  QueryAffiliateDto,
  UpdateAffiliateDto,
  UpdateAffiliateStatusDto,
} from '@app/shared';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { Prisma, Role } from '../../../prisma/prisma-client';

@Injectable()
export class AdminAffiliateService {
  private readonly logger = new Logger(AdminAffiliateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Get paginated affiliate applications list with filtering and search.
   * Returns reduced summary fields for efficient list view.
   */
  async findAll(
    query: QueryAffiliateDto,
  ): Promise<AdminAffiliatePaginatedResponseModel> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AffiliateWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { offerCode: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { bankAccountNumber: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          fullName: true,
          phoneNumber: true,
          offerCode: true,
          totalEarn: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              isBlock: true,
            },
          },
        },
      }),
      this.prisma.affiliate.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToListItemModel(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single affiliate application by ID.
   */
  async findOne(id: string): Promise<AffiliateModel> {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isBlock: true,
          },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundException(
        `Affiliate registration with ID '${id}' not found`,
      );
    }

    return this.mapToModel(affiliate);
  }

  /**
   * Update affiliate review status (Approve or Reject).
   * - If APPROVED: updates status, records review, promotes user to SELLER, and sends congratulations email.
   * - If REJECTED: updates status, records reason, and sends rejection explanation email.
   */
  async updateStatus(
    id: string,
    dto: UpdateAffiliateStatusDto,
    adminUser: AuthenticatedUser,
  ): Promise<AffiliateModel> {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!affiliate) {
      throw new NotFoundException(
        `Affiliate registration with ID '${id}' not found`,
      );
    }

    const reviewer = adminUser.username || adminUser.id;

    if (dto.status === AffiliateStatus.APPROVED) {
      const [updated] = await this.prisma.$transaction([
        this.prisma.affiliate.update({
          where: { id },
          data: {
            status: AffiliateStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedBy: reviewer,
            rejectionReason: null,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isBlock: true,
              },
            },
          },
        }),
        // Promote applicant to SELLER
        this.prisma.user.update({
          where: { id: affiliate.userId },
          data: {
            role: Role.SELLER,
          },
        }),
      ]);

      // Fire-and-forget approval email
      this.mailService
        .sendAffiliateApprovedEmail(
          affiliate.user.email,
          affiliate.user.username,
          affiliate.fullName,
          affiliate.offerCode,
        )
        .catch((err) => {
          this.logger.error(
            `Failed to send affiliate approval email to ${affiliate.user.email}: ${err.message}`,
            err.stack,
          );
        });

      return this.mapToModel(updated);
    }

    if (dto.status === AffiliateStatus.REJECTED) {
      const reason =
        dto.rejectionReason?.trim() ||
        'Hồ sơ đăng ký đối tác chưa đáp ứng đầy đủ tiêu chuẩn của chúng tôi tại thời điểm này.';

      const updated = await this.prisma.affiliate.update({
        where: { id },
        data: {
          status: AffiliateStatus.REJECTED,
          rejectionReason: reason,
          reviewedAt: new Date(),
          reviewedBy: reviewer,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              isBlock: true,
            },
          },
        },
      });

      // Fire-and-forget rejection email
      this.mailService
        .sendAffiliateRejectedEmail(
          affiliate.user.email,
          affiliate.user.username,
          affiliate.fullName,
          reason,
        )
        .catch((err) => {
          this.logger.error(
            `Failed to send affiliate rejection email to ${affiliate.user.email}: ${err.message}`,
            err.stack,
          );
        });

      return this.mapToModel(updated);
    }

    // Setting back to PENDING
    const updated = await this.prisma.affiliate.update({
      where: { id },
      data: {
        status: AffiliateStatus.PENDING,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isBlock: true,
          },
        },
      },
    });

    return this.mapToModel(updated);
  }

  /**
   * Update partner details (bank info, phone, social channels, or offerCode).
   */
  async updateAffiliate(
    id: string,
    dto: UpdateAffiliateDto,
  ): Promise<AffiliateModel> {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id },
    });

    if (!affiliate) {
      throw new NotFoundException(
        `Affiliate registration with ID '${id}' not found`,
      );
    }

    const dataToUpdate: Prisma.AffiliateUpdateInput = {};

    if (dto.fullName !== undefined) dataToUpdate.fullName = dto.fullName.trim();
    if (dto.phoneNumber !== undefined)
      dataToUpdate.phoneNumber = dto.phoneNumber.trim();
    if (dto.socialChannels !== undefined)
      dataToUpdate.socialChannels = dto.socialChannels as any;
    if (dto.promotionPlan !== undefined)
      dataToUpdate.promotionPlan = dto.promotionPlan.trim();
    if (dto.achievements !== undefined)
      dataToUpdate.achievements = dto.achievements.trim();
    if (dto.bankName !== undefined) dataToUpdate.bankName = dto.bankName.trim();
    if (dto.bankAccountNumber !== undefined)
      dataToUpdate.bankAccountNumber = dto.bankAccountNumber.trim();
    if (dto.bankAccountName !== undefined)
      dataToUpdate.bankAccountName = dto.bankAccountName.trim().toUpperCase();

    if (dto.offerCode !== undefined) {
      const normalizedCode = dto.offerCode.trim().toUpperCase();
      const codeInUse = await this.prisma.affiliate.findFirst({
        where: {
          offerCode: normalizedCode,
          id: { not: id },
        },
      });
      if (codeInUse) {
        throw new ConflictException(
          `Offer code '${normalizedCode}' is already taken by another affiliate.`,
        );
      }
      dataToUpdate.offerCode = normalizedCode;
    }

    const updated = await this.prisma.affiliate.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isBlock: true,
          },
        },
      },
    });

    return this.mapToModel(updated);
  }

  private mapToListItemModel(affiliate: any): AdminAffiliateListItemModel {
    return {
      id: affiliate.id,
      userId: affiliate.userId,
      username: affiliate.user?.username,
      email: affiliate.user?.email,
      fullName: affiliate.fullName,
      phoneNumber: affiliate.phoneNumber,
      offerCode: affiliate.offerCode,
      totalEarn: Number(affiliate.totalEarn || 0),
      status: affiliate.status as AffiliateStatus,
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
    };
  }

  private mapToModel(affiliate: any): AffiliateModel {
    return {
      id: affiliate.id,
      userId: affiliate.userId,
      username: affiliate.user?.username,
      email: affiliate.user?.email,
      fullName: affiliate.fullName,
      phoneNumber: affiliate.phoneNumber,
      socialChannels: (affiliate.socialChannels as any) || [],
      promotionPlan: affiliate.promotionPlan,
      achievements: affiliate.achievements,
      bankName: affiliate.bankName,
      bankAccountNumber: affiliate.bankAccountNumber,
      bankAccountName: affiliate.bankAccountName,
      offerCode: affiliate.offerCode,
      totalEarn: Number(affiliate.totalEarn || 0),
      status: affiliate.status as AffiliateStatus,
      rejectionReason: affiliate.rejectionReason,
      reviewedAt: affiliate.reviewedAt,
      reviewedBy: affiliate.reviewedBy,
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
    };
  }
}
