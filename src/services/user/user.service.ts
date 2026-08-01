import { PrismaService } from '@app/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@app/prisma/prisma-client';

/**
 * Encapsulates all persistence logic for {@link User} records.
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deletes all unverified user accounts whose 10-minute verification window has expired.
   */
  async cleanExpiredUnverifiedUsers(): Promise<number> {
    const result = await this.prisma.user.deleteMany({
      where: {
        isVerified: false,
        codeExpiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Cleans expired unverified accounts first, then checks if an account already exists.
   * Throws {@link ConflictException} if a verified account exists with the email or username.
   */
  async findExistingForRegister(
    email: string,
    username: string,
  ): Promise<User | null> {
    await this.cleanExpiredUnverifiedUsers();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      if (existing.isVerified) {
        const field = existing.email === email ? 'email' : 'username';
        throw new ConflictException(`A user with this ${field} already exists`);
      }
      return existing; // Return unverified account if code is still active
    }

    return null;
  }

  /**
   * Creates an unverified user with a 10-minute verification code expiration.
   */
  async createPendingUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    verificationCode: string;
    codeExpiresAt: Date;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
        isVerified: false,
        verificationCode: data.verificationCode,
        codeExpiresAt: data.codeExpiresAt,
      },
    });
  }

  /**
   * Updates an existing unverified user with a new 6-digit verification code and expiration timestamp.
   */
  async updatePendingUser(
    id: string,
    verificationCode: string,
    codeExpiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        verificationCode,
        codeExpiresAt,
      },
    });
  }

  /**
   * Marks a user as fully verified and removes the verification code & expiration timestamp.
   */
  async markUserVerified(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });
  }

  /**
   * Deletes a user by ID (used to remove accounts with expired verification codes).
   */
  async deleteUser(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /**
   * Looks up a user by unique email — used during login & verification.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findWithProducts(
    id: string,
  ): Promise<Prisma.UserGetPayload<{ include: { products: true } }> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { products: true },
    });
  }

  /**
   * Retrieves all rented games (user_games) for a specific user, including
   * product details, pricing, DLCs, and active manifest file info.
   */
  async getUserGames(userId: string) {
    const userGames = await this.prisma.userGame.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            prices: true,
            dlcs: true,
          },
        },
        manifest: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return userGames.map((ug) => ({
      id: ug.id,
      userId: ug.userId,
      productId: ug.productId,
      product: {
        id: ug.product.id,
        appId: ug.product.appId,
        name: ug.product.name,
        description: ug.product.description,
        imageUrl: ug.product.imageUrl,
        releaseDate: ug.product.releaseDate,
        developer: ug.product.developer,
        publisher: ug.product.publisher,
        genres: ug.product.genres,
        categories: ug.product.categories,
        tags: ug.product.tags,
        platforms: ug.product.platforms,
        pricing: {
          vnd:
            ug.product.prices
              .find((p) => p.currency === 'VND')
              ?.amount.toString() ?? '0',
          usd:
            ug.product.prices
              .find((p) => p.currency === 'USD')
              ?.amount.toString() ?? '0',
          cny:
            ug.product.prices
              .find((p) => p.currency === 'CNY')
              ?.amount.toString() ?? '0',
        },
        dlcs: ug.product.dlcs.map((d) => ({
          id: d.id,
          appId: d.appId,
          name: d.name,
        })),
      },
      manifestId: ug.manifestId,
      manifest: ug.manifest
        ? {
            id: ug.manifest.id,
            appId: ug.manifest.appId,
            depotId: ug.manifest.depotId,
            manifestId: ug.manifest.manifestId,
            manifestData: ug.manifest.manifestData,
            luaScript: ug.manifest.luaScript,
            version: ug.manifest.version,
            isEnabled: ug.manifest.isEnabled,
          }
        : null,
      rentedAt: ug.rentedAt,
      expiresAt: ug.expiresAt,
      status: ug.status,
      rentalPrice: ug.rentalPrice.toString(),
      rentalCurrency: ug.rentalCurrency,
      createdAt: ug.createdAt,
      updatedAt: ug.updatedAt,
    }));
  }
}
