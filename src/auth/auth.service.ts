import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../prisma/prisma-client';
import { JwtPayload } from '../common/interfaces/authenticated-user.interface';
import { generateOpaqueToken } from '../common/utils/token.util';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { TokenService } from '../token/token.service';
import { UserService } from '../user/user.service';
import { AuthTokensDto, LoginDto, RegisterDto } from '@app/shared';

@Injectable()
export class AuthService {
  private readonly accessExpiresIn: string;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessExpiresIn = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.refreshTtlMs = this.parseDurationToMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
  }

  /**
   * Registers a new customer with a bcrypt-hashed password.
   */
  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const passwordHash = await hashPassword(dto.password);
    const user = await this.userService.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
    });

    return this.issueTokens(user);
  }

  /**
   * Validates credentials and issues a new access/refresh token pair.
   */
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.userService.findByEmail(dto.email);

    // Uniform error avoids leaking which accounts exist.
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  /**
   * Validates a refresh token, then issues a new access token and rotates
   * the refresh token (old one is deleted atomically).
   */
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const stored = await this.tokenService.validateOrThrow(refreshToken);
    const user = await this.userService.findById(stored.userId);

    if (!user) {
      // Orphaned token — clean it up and reject.
      await this.tokenService.revoke(refreshToken);
      throw new UnauthorizedException('User no longer exists');
    }

    const newRefreshToken = generateOpaqueToken();
    const expiredAt = new Date(Date.now() + this.refreshTtlMs);
    await this.tokenService.rotate(
      refreshToken,
      user.id,
      newRefreshToken,
      expiredAt,
    );

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: newRefreshToken,
      expiresIn: Math.floor(this.parseDurationToMs(this.accessExpiresIn) / 1000),
      user: this.toUserResponse(user),
    };
  }

  /**
   * Revokes (deletes) a refresh token so it can no longer be used.
   */
  async revoke(refreshToken: string): Promise<void> {
    await this.tokenService.revoke(refreshToken);
  }

  /**
   * Issues a fresh access token plus a persisted refresh token.
   */
  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const refreshToken = generateOpaqueToken();
    const expiredAt = new Date(Date.now() + this.refreshTtlMs);
    await this.tokenService.save(user.id, refreshToken, expiredAt);

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken,
      expiresIn: Math.floor(this.parseDurationToMs(this.accessExpiresIn) / 1000),
      user: this.toUserResponse(user),
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessExpiresIn,
    });
  }

  private toUserResponse(user: User): AuthTokensDto['user'] {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Converts a duration string (e.g. "15m", "7d", "3600s", "500") to
   * milliseconds. Bare numbers are treated as seconds.
   */
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
