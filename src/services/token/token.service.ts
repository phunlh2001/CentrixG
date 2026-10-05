import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@app/prisma/prisma.service';
import { Token } from '@app/prisma/prisma-client';

/**
 * Manages persisted refresh tokens and active access token sessions.
 *
 * Design rules (per spec):
 *  - Refresh tokens and active access token IDs are stored in the tokens table.
 *  - "Revoke" == hard-delete the row.
 *  - An expired token can never be used.
 */
@Injectable()
export class TokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a freshly issued refresh token and access token ID for a user.
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
      throw new UnauthorizedException('Refresh token not recognized or already revoked');
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
   * Updates only the access token ID (token column) on the existing session record.
   * This immediately revokes the old access token while preserving the existing
   * refreshToken code and its original expiration timestamp.
   */
  async updateAccessToken(
    id: string,
    newAccessTokenId: string,
    ipAddress?: string,
  ): Promise<Token> {
    return this.prisma.token.update({
      where: { id },
      data: {
        token: newAccessTokenId,
        ...(ipAddress ? { ipAddress } : {}),
      },
    });
  }

  /**
   * Hard-deletes a single token row by refreshToken. Idempotent.
   */
  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.token.deleteMany({ where: { refreshToken } });
  }

  /**
   * Hard-deletes every token belonging to a user (revoking all active access and refresh tokens).
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
