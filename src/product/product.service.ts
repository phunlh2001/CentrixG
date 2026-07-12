import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Prisma } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateManyProductsDto,
  CreateProductDto,
  DeleteManyProductsDto,
  PricingDto,
  QueryProductDto,
  UpdateProductDto,
} from '../shared/dto/product';
import {
  DlcModel,
  PricingModel,
  ProductModel,
} from '../shared/models/product';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Relations always loaded so responses can expose pricing + DLCs. */
const PRODUCT_INCLUDE = {
  prices: true,
  dlcs: true,
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a single product together with its full pricing (all currencies,
   * defaulting to 0) and any DLCs. `appId` uniqueness is enforced by the DB;
   * the Prisma exception filter converts violations to HTTP 409.
   */
  async create(dto: CreateProductDto): Promise<ProductModel> {
    const product = await this.prisma.product.create({
      data: this.toCreateInput(dto),
      include: PRODUCT_INCLUDE,
    });
    return this.toModel(product);
  }

  /**
   * Creates many products atomically. If any row violates a constraint,
   * the whole batch is rolled back.
   */
  async createMany(dto: CreateManyProductsDto): Promise<ProductModel[]> {
    const appIds = dto.products.map((p) => p.appId);
    this.assertNoDuplicateAppIds(appIds);

    const created = await this.prisma.$transaction(async (tx) => {
      const clashes = await tx.product.findMany({
        where: { appId: { in: appIds } },
        select: { appId: true },
      });

      if (clashes.length > 0) {
        throw new ConflictException(
          `These appIds already exist: ${clashes
            .map((c) => c.appId)
            .join(', ')}`,
        );
      }

      // createMany doesn't support nested writes, so create sequentially.
      return Promise.all(
        dto.products.map((product) =>
          tx.product.create({
            data: this.toCreateInput(product),
            include: PRODUCT_INCLUDE,
          }),
        ),
      );
    });

    return created.map((p) => this.toModel(p));
  }

  /**
   * Lists products with pagination. Hidden (invisible) products are
   * excluded unless the caller explicitly opts in (admins only — the
   * controller gates this).
   */
  async findAll(
    query: QueryProductDto,
  ): Promise<PaginatedResult<ProductModel>> {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(query.includeHidden ? {} : { invisible: false }),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((i) => this.toModel(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Fetches one product (including its DLCs and pricing) by id. Hidden
   * products are returned only when `includeHidden` is true (admin path).
   */
  async findOne(id: string, includeHidden = false): Promise<ProductModel> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!product || (product.invisible && !includeHidden)) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.toModel(product);
  }

  /**
   * Updates a product (admins). Scalar fields, categories and tags are
   * replaced when provided; when `pricing` is supplied, all currency rows
   * are upserted (missing currencies reset to 0). Runs in a transaction.
   */
  async update(id: string, dto: UpdateProductDto): Promise<ProductModel> {
    await this.ensureExists(id);

    const product = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: this.toUpdateInput(dto),
      });

      if (dto.pricing) {
        for (const { currency, amount } of this.pricingRows(dto.pricing)) {
          await tx.productPrice.upsert({
            where: { productId_currency: { productId: id, currency } },
            create: { productId: id, currency, amount },
            update: { amount },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: PRODUCT_INCLUDE,
      });
    });

    return this.toModel(product);
  }

  /**
   * Soft-deletes a product: sets invisible = true instead of removing it.
   * DLC rows are left intact.
   */
  async softDelete(id: string): Promise<ProductModel> {
    await this.ensureExists(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: { invisible: true },
      include: PRODUCT_INCLUDE,
    });
    return this.toModel(product);
  }

  /**
   * Soft-deletes many products atomically (invisible = true for all).
   */
  async softDeleteMany(dto: DeleteManyProductsDto): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.product.updateMany({
        where: { id: { in: dto.ids } },
        data: { invisible: true },
      });
      return count;
    });
  }

  /**
   * Records a purchase: links a product to a user (many-to-many) inside a
   * transaction. Rejects hidden products, missing products and duplicate
   * ownership.
   */
  async purchase(userId: string, productId: string): Promise<ProductModel> {
    const product = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id: productId },
        include: PRODUCT_INCLUDE,
      });

      if (!existing || existing.invisible) {
        throw new NotFoundException(`Product ${productId} not available`);
      }

      const alreadyOwned = await tx.user.findFirst({
        where: { id: userId, products: { some: { id: productId } } },
        select: { id: true },
      });

      if (alreadyOwned) {
        throw new ConflictException('Product already owned by this user');
      }

      await tx.user.update({
        where: { id: userId },
        data: { products: { connect: { id: productId } } },
      });

      return existing;
    });

    return this.toModel(product);
  }

  // --- mapping -------------------------------------------------------------

  private toModel(product: ProductWithRelations): ProductModel {
    return {
      id: product.id,
      appId: product.appId,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      pricing: this.toPricing(product.prices),
      releaseDate: product.releaseDate,
      developer: product.developer,
      publisher: product.publisher,
      genres: product.genres,
      categories: product.categories,
      tags: product.tags,
      platforms: product.platforms,
      dlcs: product.dlcs.map((d): DlcModel => ({
        id: d.id,
        appId: d.appId,
        name: d.name,
        productId: d.productId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      invisible: product.invisible,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toPricing(prices: ProductWithRelations['prices']): PricingModel {
    const amountOf = (currency: Currency): string =>
      prices.find((p) => p.currency === currency)?.amount.toString() ?? '0';

    return {
      vnd: amountOf(Currency.VND),
      usd: amountOf(Currency.USD),
      cny: amountOf(Currency.CNY),
    };
  }

  // --- helpers -------------------------------------------------------------

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException(`Product ${id} not found`);
    }
  }

  private assertNoDuplicateAppIds(appIds: number[]): void {
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const appId of appIds) {
      if (seen.has(appId)) {
        dupes.add(appId);
      }
      seen.add(appId);
    }
    if (dupes.size > 0) {
      throw new ConflictException(
        `Duplicate appIds in request: ${[...dupes].join(', ')}`,
      );
    }
  }

  /**
   * Expands a PricingDto into one row per supported currency, defaulting any
   * omitted currency to 0. Extend here when the Currency enum grows.
   */
  private pricingRows(
    pricing?: PricingDto,
  ): { currency: Currency; amount: number }[] {
    return [
      { currency: Currency.VND, amount: pricing?.vnd ?? 0 },
      { currency: Currency.USD, amount: pricing?.usd ?? 0 },
      { currency: Currency.CNY, amount: pricing?.cny ?? 0 },
    ];
  }

  private toCreateInput(dto: CreateProductDto): Prisma.ProductCreateInput {
    return {
      appId: dto.appId,
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
      developer: dto.developer,
      publisher: dto.publisher,
      genres: dto.genres ?? [],
      categories: dto.categories ?? [],
      tags: dto.tags ?? [],
      platforms: dto.platforms ?? [],
      prices: {
        create: this.pricingRows(dto.pricing),
      },
      ...(dto.dlcs && dto.dlcs.length > 0
        ? {
            dlcs: {
              create: dto.dlcs.map((d) => ({ appId: d.appId, name: d.name })),
            },
          }
        : {}),
    };
  }

  private toUpdateInput(dto: UpdateProductDto): Prisma.ProductUpdateInput {
    return {
      ...(dto.appId !== undefined && { appId: dto.appId }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.releaseDate !== undefined && {
        releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
      }),
      ...(dto.developer !== undefined && { developer: dto.developer }),
      ...(dto.publisher !== undefined && { publisher: dto.publisher }),
      ...(dto.genres !== undefined && { genres: dto.genres }),
      ...(dto.categories !== undefined && { categories: dto.categories }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.platforms !== undefined && { platforms: dto.platforms }),
      ...(dto.invisible !== undefined && { invisible: dto.invisible }),
    };
  }
}
