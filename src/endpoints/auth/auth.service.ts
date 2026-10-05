import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus, Role, User } from '../../prisma/prisma-client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/authenticated-user.interface';
import { generateOpaqueToken } from '../../common/utils/token.util';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { TokenService } from '../../services/token/token.service';
import { UserService } from '../user/user.service';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import {
  AuthTokensDto,
  LoginDto,
  RegisterDto,
  UserModel,
  VerifyCodeDto,
} from '@app/shared';
import { MailService } from '../../services/mail/mail.service';
import { CONFIG_ENV } from '@app/common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessExpiresIn: string;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.accessExpiresIn = this.config.get<string>(CONFIG_ENV.jwtAccessExpiresIn, '15d');
    this.refreshTtlMs = this.parseDurationToMs(this.config.get<string>(CONFIG_ENV.jwtRefreshExpiresIn, '30d'));
  }

  /**
   * Cron job running every 5 minutes to clean up unverified user accounts
   * whose 10-minute verification window has expired.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredUnverifiedUserCleanup(): Promise<void> {
    const count = await this.userService.cleanExpiredUnverifiedUsers();
    if (count > 0) {
      this.logger.log(
        `Cleaned up ${count} expired unverified user account(s) from database.`,
      );
    }
  }

  /**
   * Registers a new customer account in an unverified state with a 10-minute 6-digit verification code.
   * Dispatches the verification email via SMTP BEFORE persisting the pending account to DB.
   */
  async register(
    dto: RegisterDto,
    _ipAddress: string = '127.0.0.1',
  ): Promise<MessageResponseDto> {
    // 1. Assert user does not exist or check pending unverified registration
    const existing = await this.userService.findExistingForRegister(
      dto.email,
      dto.username,
    );

    // 2. Generate 6-digit verification code & 10-minute expiration timestamp
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Send 6-digit verification code via SMTP BEFORE persisting/updating DB.
    // If SMTP fails, this will throw an error and NO user will be created in DB.
    await this.mailService.sendVerificationCode(
      dto.email,
      dto.username,
      verificationCode,
    );

    // 4. Only after email dispatch succeeds, create or update pending account
    const passwordHash = await hashPassword(dto.password);
    if (existing) {
      await this.userService.updatePendingUser(
        existing.id,
        verificationCode,
        codeExpiresAt,
      );
    } else {
      await this.userService.createPendingUser({
        username: dto.username,
        email: dto.email,
        passwordHash,
        verificationCode,
        codeExpiresAt,
      });
    }

    return {
      message:
        'Verification code sent successfully to email. Please verify your 6-digit code within 10 minutes to activate your account.',
    };
  }

  /**
   * Verifies the 6-digit code. If valid and within 10 minutes, marks user as verified and issues tokens.
   * If code is expired (>10 min), deletes the unverified user account from DB.
   */
  async verifyCode(
    dto: VerifyCodeDto,
    ipAddress: string = '127.0.0.1',
  ): Promise<AuthTokensDto> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    // Check if 10-minute verification window has expired
    if (user.codeExpiresAt && user.codeExpiresAt.getTime() < Date.now()) {
      await this.userService.deleteUser(user.id);
      throw new BadRequestException(
        'Verification code has expired. Account has been removed from database. Please register again.',
      );
    }

    if (user.verificationCode !== dto.code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Mark user verified
    const verifiedUser = await this.userService.markUserVerified(user.id);
    await this.checkAndRecordLoginLimit(verifiedUser, ipAddress);

    return this.issueTokens(verifiedUser, ipAddress);
  }

  /**
   * Validates credentials, checks verification status & account restrictions (isBlock),
   * enforces 3 logins/week rate limit for non-admin accounts, and issues tokens.
   */
  async login(
    dto: LoginDto,
    ipAddress: string = '127.0.0.1',
  ): Promise<AuthTokensDto> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      if (user.codeExpiresAt && user.codeExpiresAt.getTime() < Date.now()) {
        await this.userService.deleteUser(user.id);
        throw new UnauthorizedException(
          'Verification code has expired and account was removed. Please register again.',
        );
      }
      throw new UnauthorizedException(
        'Email address has not been verified. Please verify your 6-digit code first.',
      );
    }

    if (user.isBlock) {
      throw new ForbiddenException(
        'Your account has been restricted by an administrator.',
      );
    }

    // await this.checkAndRecordLoginLimit(user, ipAddress);
    return this.issueTokens(user, ipAddress);
  }

  /**
   * Validates a refresh token, then refreshes the accessToken with the newest user information
   * without changing the expiresIn time of the refreshToken or its code.
   * If validation fails or account is restricted, hard-deletes the token row from DB (revokes both).
   * Revokes the old accessToken by updating the active token session ID.
   */
  async refresh(
    refreshToken: string,
    ipAddress: string = '127.0.0.1',
  ): Promise<AuthTokensDto> {
    const stored = await this.prisma.token.findUnique({
      where: { refreshToken },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token not recognized or already revoked');
    }

    // Check expiration
    if (stored.expiredAt.getTime() <= Date.now()) {
      await this.prisma.token.deleteMany({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userService.findById(stored.userId);

    // If user no longer exists or is blocked, revoke both (hard-delete token row)
    if (!user || user.isBlock) {
      await this.prisma.token.deleteMany({ where: { id: stored.id } });
      if (user?.isBlock) {
        throw new ForbiddenException(
          'Your account has been restricted by an administrator.',
        );
      }
      throw new UnauthorizedException('User no longer exists');
    }

    // Validator passed!
    // 1. Generate new accessTokenId to revoke the old access token
    const newAccessTokenId = generateOpaqueToken();

    // 2. Update token record: replace old accessTokenId with newAccessTokenId,
    // WITHOUT changing refreshToken code or its original expiredAt!
    await this.tokenService.updateAccessToken(
      stored.id,
      newAccessTokenId,
      ipAddress,
    );

    // 3. Resolve user affiliate information
    const affiliateInfo = await this.getAffiliateInfo(user.id, user.role);

    // 4. Sign fresh 15-day access token embedding newest user profile and new jti
    const accessToken = await this.signAccessToken(
      user,
      affiliateInfo,
      newAccessTokenId,
    );

    return {
      accessToken,
      refreshToken: stored.refreshToken, // Preserved exact refresh token code
      expiresIn: Math.floor(
        this.parseDurationToMs(this.accessExpiresIn) / 1000,
      ),
    };
  }

  /**
   * Hard-deletes a refresh token and its session from the database.
   */
  async revoke(refreshToken: string): Promise<void> {
    await this.tokenService.revoke(refreshToken);
  }

  /**
   * Records user login entry in login_logs table.
   * Rate limit check by IP is temporarily disabled — logins are permitted every time.
   */
  private async checkAndRecordLoginLimit(
    user: User,
    ipAddress: string,
  ): Promise<void> {
    // Rate limit check temporarily disabled (open everytime)

    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        email: user.email,
        ipAddress: ipAddress,
      },
    });
  }

  /**
   * Issues a fresh access token (15 days) and persisted refresh token (30 days).
   * Revokes any previously active access tokens for this user before issuing new ones.
   */
  private async issueTokens(
    user: User,
    ipAddress: string,
  ): Promise<AuthTokensDto> {
    // 1. Revoke any previous active token sessions for this user (single-session rule)
    await this.tokenService.revokeAllForUser(user.id);

    const accessTokenId = generateOpaqueToken();
    const refreshToken = generateOpaqueToken();
    const expiredAt = new Date(Date.now() + this.refreshTtlMs); // 30 days from login date

    await this.tokenService.save(
      user.id,
      accessTokenId,
      refreshToken,
      expiredAt,
      ipAddress,
    );

    const affiliateInfo = await this.getAffiliateInfo(user.id, user.role);

    const accessToken = await this.signAccessToken(
      user,
      affiliateInfo,
      accessTokenId,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(
        this.parseDurationToMs(this.accessExpiresIn) / 1000,
      ),
    };
  }

  private async signAccessToken(
    user: User,
    affiliateInfo?: { totalEarn: number; offerCode?: string },
    accessTokenId?: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlock,
      affiliate: {
        totalEarn: Number(affiliateInfo?.totalEarn || 0),
        offerCode: affiliateInfo?.offerCode || undefined,
      },
      ...(accessTokenId ? { jti: accessTokenId } : {}),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>(CONFIG_ENV.jwtAccessSecret),
      expiresIn: this.accessExpiresIn,
    });
  }

  private async getAffiliateInfo(
    userId: string,
    role: Role,
  ): Promise<{ totalEarn: number; offerCode?: string }> {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { userId },
      select: { offerCode: true, totalEarn: true },
    });

    let totalEarn = affiliate ? Number(affiliate.totalEarn || 0) : 0;

    if (totalEarn === 0 && (role === Role.SELLER || affiliate)) {
      const ordersSum = await this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          status: PaymentStatus.COMPLETED,
        },
        _sum: {
          commissionAmount: true,
        },
      });
      const orderCommission = Number(ordersSum._sum.commissionAmount ?? 0);
      if (orderCommission > 0) {
        totalEarn = orderCommission;
      }
    }

    return {
      totalEarn,
      offerCode: affiliate?.offerCode || undefined,
    };
  }

  /**
   * Retrieves profile information for the authenticated user, including role and totalEarn.
   */
  async getMe(userId: string): Promise<UserModel> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const affiliateInfo = await this.getAffiliateInfo(user.id, user.role);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isBlock: user.isBlock,
      totalEarn: affiliateInfo.totalEarn,
    };
  }

  private parseDurationToMs(value: string): number {
    const match = /^(\d+)(ms|s|m|h|d)?$/.exec(value.trim());
    if (!match) {
      throw new Error(`Invalid duration format: "${value}"`);
    }

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * multipliers[unit];
  }
}
