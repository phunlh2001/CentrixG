import { Prisma } from '@app/prisma/prisma-client';
import { PrismaService } from '@app/prisma/prisma.service';
import { AdminCategoryModel } from '@app/shared';
import { Injectable } from '@nestjs/common';

type TypeWithRelations = Prisma.TypeGetPayload<{
  include: {
    products: true
  }
}>;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const type = await this.prisma.$transaction(async (tx) => {
      return tx.type.findMany({
        include: {
          products: true
        }
      })
    });

    return type.map((t) => this.toModel(t));
  }

  // --- mapping -------------------------------------------------------------
  private toModel(type: TypeWithRelations): AdminCategoryModel {
    return {
      id: type.id,
      name: type.name,
      description: type.description,
      productCount: type.products.length,
      createdAt: type.createdAt,
    };
  }
}
