import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  Currency,
  Prisma,
} from "../../prisma/prisma-client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateDlcDto,
  CreateProductDto,
  DlcModel,
  PricingDto,
  PricingModel,
  ProductMode,
  ProductModel,
  PurchaseManyProductsDto,
  QueryProductDto,
  UpdateProductDto,
} from "@app/shared";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Relations always loaded so responses can expose pricing, DLCs, categories, type, and manifests. */
const PRODUCT_INCLUDE = {
  prices: true,
  dlcs: true,
  categories: true,
  manifests: true,
  type: true,
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
   * Lists products with pagination. Only returns products that have a manifest file.
   * Excludes products already owned by the user if authenticated.
   */
  async findAll(
    query: QueryProductDto,
    userId?: string,
  ): Promise<PaginatedResult<ProductModel>> {
    const isUnpaginated = query.limit == null;
    const page = query.page ?? 1;
    const limit = query.limit;
    const skip = limit != null ? (page - 1) * limit : undefined;
    const take = limit != null ? limit : undefined;

    let filterCondition: Prisma.ProductWhereInput;

    switch (query.mode) {
      case ProductMode.PRODUCT:
        filterCondition = { manifests: { some: {} }, isDelete: false };
        break;
      case ProductMode.WAREHOUSE:
        filterCondition = { manifests: { none: {} }, isDelete: false };
        break;
      case ProductMode.TRASH:
        filterCondition = { isDelete: true };
        break;
      case ProductMode.STOREFRONT:
      default:
        filterCondition = { manifests: { some: {} }, isDelete: false, disabled: false };
        break;
    }

    const where: Prisma.ProductWhereInput = {
      ...filterCondition,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              {
                categories: {
                  some: { name: { contains: query.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
      ...(userId
        ? {
            owners: {
              none: { id: userId },
            },
          }
        : {}),
    };

    if (query.orderByPrice) {
      const priceSort = query.orderByPrice.toLowerCase() as 'asc' | 'desc';
      const [prices, total] = await this.prisma.$transaction([
        this.prisma.productPrice.findMany({
          where: {
            currency: Currency.VND,
            product: where,
          },
          orderBy: [
            { amount: priceSort },
            { product: { createdAt: 'desc' } },
            { product: { updatedAt: 'desc' } },
          ],
          skip,
          take,
          include: {
            product: {
              include: PRODUCT_INCLUDE,
            },
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        items: prices.map((p) => this.toModel(p.product)),
        total,
        page: isUnpaginated ? 1 : page,
        limit: isUnpaginated ? total : limit!,
        totalPages: isUnpaginated
          ? total > 0
            ? 1
            : 0
          : Math.ceil(total / limit!) || 0,
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy:
          query.newest
            ? { updatedAt: 'desc' }
            : [{ createdAt: 'desc' }, { updatedAt: 'desc' }],
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((i) => this.toModel(i)),
      total,
      page: isUnpaginated ? 1 : page,
      limit: isUnpaginated ? total : limit!,
      totalPages: isUnpaginated
        ? total > 0
          ? 1
          : 0
        : Math.ceil(total / limit!) || 0,
    };
  }

  /**
   * Fetches one product by id (including DLCs, pricing, categories, and manifest).
   * Only returns products that have a manifest file. Hidden products are returned
   * only when `includeHidden` is true (admin path).
   */
  async findOne(id: string): Promise<ProductModel> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        manifests: { some: {} },
        isDelete: false,
      },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found or missing manifest`);
    }

    return this.toModel(product);
  }

  /**
   * Fetches one product by Steam AppID (including DLCs, pricing, categories, and manifest if available).
   * Hidden products are returned only when `includeHidden` is true (admin path).
   */
  async findByAppId(appId: number): Promise<ProductModel> {
    const product = await this.prisma.product.findFirst({
      where: { appId },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product with AppID ${appId} not found`);
    }

    return this.toModel(product);
  }

  /**
   * Updates a product (admins). Scalar fields and categories are
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

      if (dto.categories !== undefined) {
        await tx.category.deleteMany({ where: { productId: id } });
        if (dto.categories.length > 0) {
          await tx.category.createMany({
            data: dto.categories.map((name) => ({ productId: id, name })),
          });
        }
      }

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
   * Toggle visibility of a product (admins). Runs in a transaction.
   */
  async toggleVisibility(id: string, value: boolean): Promise<ProductModel> {
    await this.ensureExists(id);

    const product = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { disabled: value },
      });

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: PRODUCT_INCLUDE,
      });
    });

    return this.toModel(product);
  }

  /**
   * Soft-deletes a product: sets isDelete = true instead of removing it.
   * DLC rows are left intact.
   */
  async softDelete(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.prisma.product.update({
      where: { id },
      data: { isDelete: true },
    });
  }

  /**
   * Restores a soft-deleted product: sets isDelete = false.
   * Does NOT restore manifests — you must call import manifest separately.
   */
  async restore(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.prisma.product.update({
      where: { id },
      data: { isDelete: false },
    });
  }

  /**
   * Hard-deletes a product: permanently removes DLCs, manifest files, prices, categories,
   * and product record from database. Restricted to MOD role in controller.
   */
  async hardDelete(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, appId: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dLC.deleteMany({ where: { productId: id } });
      await tx.manifestFile.deleteMany({ where: { appId: product.appId } });
      await tx.productPrice.deleteMany({ where: { productId: id } });
      await tx.category.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
  }

  /**
   * Records a purchase of multiple products for a user in a single atomic transaction.
   * If userId is not provided (unauthenticated purchase), resolves a guest customer account.
   * Connects all products to user's library, populates user_games rental entries for each product,
   * and records a single consolidated bill transaction in the bills table.
   */
  async purchase(
    dto: PurchaseManyProductsDto,
    userId: string,
  ): Promise<ProductModel[]> {
    if (!userId) {
      throw new UnauthorizedException("User must be logged in to purchase products");
    }

    if (!dto.productIds || dto.productIds.length === 0) {
      throw new BadRequestException("Product IDs list cannot be empty");
    }

    const uniqueProductIds = Array.from(new Set(dto.productIds));
    const targetUserId = userId;

    const purchasedProducts = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch all requested products with pricing
      const products = await tx.product.findMany({
        where: { id: { in: uniqueProductIds } },
        include: PRODUCT_INCLUDE,
      });

      if (products.length !== uniqueProductIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missing = uniqueProductIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `These products are not available: ${missing.join(", ")}`,
        );
      }

      // Check if any product is soft-deleted
      const deletedProducts = products.filter((p) => p.isDelete);
      if (deletedProducts.length > 0) {
        throw new BadRequestException(
          `These products are not available for purchase: ${deletedProducts
            .map((p) => p.name)
            .join(", ")}`,
        );
      }

      // 2. Check existing direct ownership
      const alreadyOwnedDirect = await tx.user.findFirst({
        where: {
          id: targetUserId,
          products: { some: { id: { in: uniqueProductIds } } },
        },
        select: {
          products: {
            where: { id: { in: uniqueProductIds } },
            select: { id: true, name: true },
          },
        },
      });

      if (alreadyOwnedDirect && alreadyOwnedDirect.products.length > 0) {
        const ownedNames = alreadyOwnedDirect.products.map((p) => p.name);
        throw new ConflictException(
          `These products are already owned by you: ${ownedNames.join(", ")}`,
        );
      }

      // 3. Connect all products to user's direct library (UserProducts)
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          products: {
            connect: uniqueProductIds.map((id) => ({ id })),
          },
        },
      });

      let totalAmount = new Prisma.Decimal(0);
      let billCurrency: Currency = Currency.VND;

      // 4. Calculate total bill amount across all purchased products
      for (const product of products) {
        const vndPrice = product.prices.find((p) => p.currency === Currency.VND);
        const usdPrice = product.prices.find((p) => p.currency === Currency.USD);
        const chosenPrice = vndPrice ?? usdPrice ?? product.prices[0];

        const itemPrice = chosenPrice ? chosenPrice.amount : new Prisma.Decimal(0);
        const itemCurrency = chosenPrice ? chosenPrice.currency : Currency.VND;

        totalAmount = totalAmount.add(itemPrice);
        billCurrency = itemCurrency;
      }

      return products;
    });

    return purchasedProducts.map((p) => this.toModel(p));
  }

  async updateCategory(
    productId: string,
    categoryName: string,
  ): Promise<void> {
    await this.ensureExists(productId);

    if (!categoryName) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { typeId: null },
      });
      return;
    }

    const type = await this.prisma.type.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
    });

    if (!type) {
      throw new BadRequestException(`Category '${categoryName}' not found`);
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { typeId: type.id },
    });
  }

  // --- mapping -------------------------------------------------------------

  private toModel(product: ProductWithRelations): ProductModel {
    const manifest =
      product.manifests && product.manifests.length > 0
        ? product.manifests[0]
        : null;

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
      categories: product.categories.map((c) => c.name),
      type: product.type
        ? {
            id: product.type.id,
            name: product.type.name,
          }
        : null,
      platforms: product.platforms,
      dlcs: product.dlcs.map((d: DlcModel): DlcModel => ({
        id: d.id,
        appId: d.appId,
        name: d.name,
        productId: d.productId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      manifestUrl: manifest?.manifestUrl ?? null,
      disabled: product.disabled,
      isDelete: product.isDelete,
      isDenuvo: product.isDenuvo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toPricing(prices: ProductWithRelations["prices"]): PricingModel {
    const amountOf = (currency: Currency): string =>
      prices.find((p) => p.currency === currency)?.amount.toString() ?? "0";

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
      platforms: dto.platforms ?? [],
      isDenuvo: dto.isDenuvo ?? false,
      prices: {
        create: this.pricingRows(dto.pricing),
      },
      ...(dto.categories && dto.categories.length > 0
        ? {
            categories: {
              create: dto.categories.map((name) => ({ name })),
            },
          }
        : {}),
      ...(dto.dlcs && dto.dlcs.length > 0
        ? {
            dlcs: {
              create: dto.dlcs.map((d: CreateDlcDto) => ({
                appId: d.appId,
                name: d.name,
              })),
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
      ...(dto.platforms !== undefined && { platforms: dto.platforms }),
      ...(dto.isDelete !== undefined && { isDelete: dto.isDelete }),
      ...(dto.isDenuvo !== undefined && { isDenuvo: dto.isDenuvo }),
      ...(dto.disabled !== undefined && { disabled: dto.disabled }),
    };
  }
}
