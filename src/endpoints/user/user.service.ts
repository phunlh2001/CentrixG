import { PrismaService } from '../../prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Prisma, User } from '../../prisma/prisma-client';
import {
  DlcModel,
  ManifestModel,
  ProductModel,
  UserGameModel,
} from '@app/shared';

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
   * Retrieves or creates a default guest user record for unauthenticated / anonymous purchases.
   */
  async findOrCreateGuestUser(): Promise<User> {
    const guestEmail = 'guest@centrix.dev';
    let guest = await this.prisma.user.findUnique({
      where: { email: guestEmail },
    });

    if (!guest) {
      guest = await this.prisma.user.create({
        data: {
          username: 'guest_player',
          email: guestEmail,
          passwordHash: '$2b$10$GuestDefaultPasswordHash0000000000000000000',
          isVerified: true,
          role: 'CUSTOMER',
        },
      });
    }

    return guest;
  }

  /**
   * Retrieves all purchased games for a specific user from UserProducts (User.products)
   * including product details, pricing, DLCs, and active manifest file info.
   */
  async getUserGames(userId: string): Promise<UserGameModel[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        products: {
          include: {
            prices: true,
            dlcs: true,
            manifests: true,
            categories: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user.products.map((product) => {
      const vndPrice = product.prices.find((p) => p.currency === Currency.VND);
      const usdPrice = product.prices.find((p) => p.currency === Currency.USD);
      const cnyPrice = product.prices.find((p) => p.currency === Currency.CNY);

      const latestManifest =
        product.manifests.length > 0 ? product.manifests[0] : null;

      const productModel: ProductModel = {
        id: product.id,
        appId: product.appId,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        pricing: {
          vnd: vndPrice?.amount.toString() ?? '0',
          usd: usdPrice?.amount.toString() ?? '0',
          cny: cnyPrice?.amount.toString() ?? '0',
        },
        releaseDate: product.releaseDate,
        developer: product.developer,
        publisher: product.publisher,
        categories: product.categories.map((c) => c.name),
        platforms: product.platforms,
        dlcs: product.dlcs.map(
          (d): DlcModel => ({
            id: d.id,
            appId: d.appId,
            name: d.name,
            productId: d.productId,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          }),
        ),
        manifestUrl: latestManifest?.manifestUrl ?? null,
        disabled: product.disabled,
        isDelete: product.isDelete,
        isDenuvo: product.isDenuvo,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };

      const manifestModel: ManifestModel | null = latestManifest
        ? {
            id: latestManifest.id,
            appId: latestManifest.appId,
            manifestUrl: latestManifest.manifestUrl,
            createdAt: latestManifest.createdAt,
            updatedAt: latestManifest.updatedAt,
          }
        : null;

      return {
        product: productModel,
        manifest: manifestModel,
      };
    });
  }
}
