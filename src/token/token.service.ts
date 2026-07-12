import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Token } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

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
    token: string,
    expiredAt: Date,
  ): Promise<Token> {
    return this.prisma.token.create({
      data: { token, userId, expiredAt },
    });
  }

  /**
   * Resolves a stored refresh token, enforcing existence and expiration.
   * Expired tokens are proactively deleted before rejecting.
   */
  async validateOrThrow(token: string): Promise<Token> {
    const stored = await this.prisma.token.findUnique({ where: { token } });

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
  async revoke(token: string): Promise<void> {
    await this.prisma.token.deleteMany({ where: { token } });
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
    oldToken: string,
    userId: string,
    newToken: string,
    expiredAt: Date,
  ): Promise<Token> {
    const [, created] = await this.prisma.$transaction([
      this.prisma.token.deleteMany({ where: { token: oldToken } }),
      this.prisma.token.create({
        data: { token: newToken, userId, expiredAt },
      }),
    ]);

    return created;
  }
}
