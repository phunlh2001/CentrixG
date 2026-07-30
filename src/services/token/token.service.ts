import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { Token } from '@app/prisma/prisma-client';

/**
 * Manages persisted refresh tokens.
 *
 * Design rules (per spec):
 *  - Only refresh tokens are stored.
 *  - "Revoke" == delete the row.
 *  - An expired token can never be used.
 */
@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a freshly issued refresh token for a user.
   */
  async save(
    userId: string,
    accessTokenId: string,
    refreshToken: string,
    expiredAt: Date,
    ipAddress?: string,
  ): Promise<Token> {
    return this.prisma.token.create({
      data: {
        userId,
        token: accessTokenId,
        refreshToken,
        expiredAt,
        ipAddress: ipAddress || null,
      },
    });
  }

  /**
   * Resolves a stored refresh token, enforcing existence and expiration.
   * Expired tokens are proactively deleted before rejecting.
   */
  async validateOrThrow(refreshToken: string): Promise<Token> {
    const stored = await this.prisma.token.findUnique({
      where: { refreshToken },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    if (stored.expiredAt.getTime() <= Date.now()) {
      await this.prisma.token.delete({ where: { id: stored.id } }).catch(() => {
        // Already gone — nothing to clean up.
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    return stored;
  }

  /**
   * Revokes (deletes) a single refresh token. Idempotent: revoking an
   * already-removed token succeeds silently.
   */
  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.token.deleteMany({ where: { refreshToken } });
  }

  /**
   * Revokes every refresh token belonging to a user (e.g. full logout).
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.token.deleteMany({ where: { userId } });
  }

  /**
   * Atomically rotates a refresh token: the old row is deleted and a new
   * one is created in a single transaction.
   */
  async rotate(
    oldRefreshToken: string,
    userId: string,
    newAccessTokenId: string,
    newRefreshToken: string,
    expiredAt: Date,
    ipAddress?: string,
  ): Promise<Token> {
    const [, created] = await this.prisma.$transaction([
      this.prisma.token.deleteMany({ where: { refreshToken: oldRefreshToken } }),
      this.prisma.token.create({
        data: {
          token: newAccessTokenId,
          refreshToken: newRefreshToken,
          userId,
          expiredAt,
          ipAddress: ipAddress || null,
        },
      }),
    ]);

    return created;
  }
}
