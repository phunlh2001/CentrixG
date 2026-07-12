import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Encapsulates all persistence logic for {@link User} records.
 * Other modules (Auth, Product) depend on this service rather than
 * touching Prisma directly, keeping user concerns in one place.
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a user. Throws {@link ConflictException} if the username or
   * email is already taken.
   */
  async create(data: {
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
      select: { email: true, username: true },
    });

    if (existing) {
      const field = existing.email === data.email ? 'email' : 'username';
      throw new ConflictException(`A user with this ${field} already exists`);
    }

    return this.prisma.user.create({ data });
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
   * Looks up a user by their unique email — used during login.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Returns the product ids already owned by the user, so purchases can
   * be validated without loading full relations.
   */
  async findWithProducts(
    id: string,
  ): Promise<Prisma.UserGetPayload<{ include: { products: true } }> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { products: true },
    });
  }
}
