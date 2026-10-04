import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AffiliateModel,
  AffiliateStatus,
  ApplyAffiliateDto,
} from '@app/shared';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Injectable()
export class AffiliateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply for affiliate partner or resubmit a previously rejected application.
   */
  async apply(
    currentUser: AuthenticatedUser,
    dto: ApplyAffiliateDto,
  ): Promise<AffiliateModel> {
    const normalizedCode = dto.offerCode.trim().toUpperCase();

    // Check if the current user already has an affiliate registration
    const existing = await this.prisma.affiliate.findUnique({
      where: { userId: currentUser.id },
    });

    if (existing) {
      if (existing.status === AffiliateStatus.APPROVED) {
        throw new BadRequestException(
          'You are already an approved affiliate partner.',
        );
      }
      if (existing.status === AffiliateStatus.PENDING) {
        throw new BadRequestException(
          'Your affiliate registration is already under review.',
        );
      }
      // If status is REJECTED, user is allowed to resubmit updated details
      const codeInUse = await this.prisma.affiliate.findFirst({
        where: {
          offerCode: normalizedCode,
          userId: { not: currentUser.id },
        },
      });
      if (codeInUse) {
        throw new ConflictException(
          `Offer code '${normalizedCode}' is already taken. Please choose another code.`,
        );
      }

      const updated = await this.prisma.affiliate.update({
        where: { id: existing.id },
        data: {
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phoneNumber.trim(),
          socialChannels: dto.socialChannels as any,
          promotionPlan: dto.promotionPlan.trim(),
          achievements: dto.achievements.trim(),
          bankName: dto.bankName.trim(),
          bankAccountNumber: dto.bankAccountNumber.trim(),
          bankAccountName: dto.bankAccountName.trim().toUpperCase(),
          offerCode: normalizedCode,
          status: AffiliateStatus.PENDING,
          rejectionReason: null,
          reviewedAt: null,
          reviewedBy: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return this.mapToModel(updated);
    }

    // New application: ensure code is not used by any affiliate
    const codeInUse = await this.prisma.affiliate.findUnique({
      where: { offerCode: normalizedCode },
    });
    if (codeInUse) {
      throw new ConflictException(
        `Offer code '${normalizedCode}' is already taken. Please choose another code.`,
      );
    }

    const created = await this.prisma.affiliate.create({
      data: {
        userId: currentUser.id,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber.trim(),
        socialChannels: dto.socialChannels as any,
        promotionPlan: dto.promotionPlan.trim(),
        achievements: dto.achievements.trim(),
        bankName: dto.bankName.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim().toUpperCase(),
        offerCode: normalizedCode,
        status: AffiliateStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return this.mapToModel(created);
  }

  /**
   * Get the current user's affiliate profile and status.
   */
  async getMyAffiliate(userId: string): Promise<AffiliateModel | null> {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!affiliate) {
      return null;
    }

    return this.mapToModel(affiliate);
  }

  /**
   * Check if an offer code is valid and available.
   */
  async checkCodeAvailability(
    code: string,
    currentUserId?: string,
  ): Promise<{ available: boolean; code: string; message: string }> {
    const trimmed = (code || '').trim().toUpperCase();

    if (!trimmed || !/^[A-Z0-9]{4,12}$/.test(trimmed)) {
      return {
        available: false,
        code: trimmed,
        message: 'Offer code must be 4 to 12 alphanumeric characters (A-Z, 0-9).',
      };
    }

    const existing = await this.prisma.affiliate.findFirst({
      where: {
        offerCode: trimmed,
        ...(currentUserId ? { userId: { not: currentUserId } } : {}),
      },
    });

    if (existing) {
      return {
        available: false,
        code: trimmed,
        message: `Offer code '${trimmed}' is already taken.`,
      };
    }

    return {
      available: true,
      code: trimmed,
      message: `Offer code '${trimmed}' is available!`,
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
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
    };
  }
}
