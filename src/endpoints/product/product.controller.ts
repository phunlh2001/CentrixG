import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../../prisma/prisma-client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  MessageResponseDto,
} from "../../common/dto/message-response.dto";
import {
  BulkDeleteProductsDto,
  CreateProductDto,
  PaginatedProductsModel,
  ProductModel,
  PurchaseManyProductsDto,
  QueryProductDto,
  UpdateProductDto,
  UpdateProductTypeDto,
} from "@app/shared";
import { PaginatedResult, ProductService } from "./product.service";
import { VisibilityProductDto } from "@app/shared/dto/product/visibility-product";

@ApiTags("Products")
@ApiBearerAuth("access-token")
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // --- TEMPORARILY PUBLIC: create ----------------------------------------
  //
  // NOTE: authorization is intentionally removed from POST /products for now
  // — it is publicly accessible (anonymous), with no JWT or ADMIN role
  // required. To re-enable protection later, delete the `@Public()` line and
  // restore `@Roles(Role.ADMIN)` (and the ApiForbiddenResponse doc). The
  // service implementation is unchanged, so re-enabling is a controller-only
  // edit.

  @Post()
  @Public()
  @ApiOperation({ summary: "Create a product (currently public / anonymous)" })
  @ApiCreatedResponse({ type: ProductModel })
  @ApiConflictResponse({ description: "appId already exists" })
  create(@Body() dto: CreateProductDto): Promise<ProductModel> {
    return this.productService.create(dto);
  }

  // --- Admin & Mod: write operations --------------------------------------------
  @Patch(":id")
  @Roles(Role.ADMIN, Role.MOD)
  @ApiOperation({ summary: "Update a product details" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not found" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductModel> {
    return this.productService.update(id, dto);
  }

  @Patch(":id/visibility")
  @Roles(Role.ADMIN, Role.MOD)
  @ApiOperation({ summary: "Toggle visibility of a product" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not found" })
  toggleVisibility(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VisibilityProductDto
  ): Promise<ProductModel> {
    return this.productService.toggleVisibility(id, dto.value);
  }

  @Patch(":id/hide")
  @Roles(Role.ADMIN, Role.MOD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Soft-delete / hide a product (admin & mod). Sets isDelete = true.",
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: "Product not found" })
  async softDelete(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.productService.softDelete(id);
    return { message: `Product ${id} hidden` };
  }

  @Patch(":id/restore")
  @Roles(Role.ADMIN, Role.MOD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Restore a soft-deleted product. Sets isDelete = false. Does NOT restore manifests.",
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: "Product not found" })
  async restoreProduct(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.productService.restore(id);
    return { message: `Product ${id} restored (manifests remain disconnected)` };
  }

  @Delete("bulk")
  @Roles(Role.ADMIN, Role.MOD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hard-delete multiple products permanently (ADMIN & MOD roles).",
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({
    description: "One or more products in productIds list do not exist",
  })
  @ApiBadRequestResponse({
    description: "Invalid input payload or empty productIds list",
  })
  async bulkDelete(
    @Body() dto: BulkDeleteProductsDto,
  ): Promise<MessageResponseDto> {
    return this.productService.bulkDelete(dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.MOD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hard-delete a product from database permanently (MOD role only).",
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: "Product not found" })
  async hardDelete(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.productService.hardDelete(id);
    return { message: `Product ${id} permanently deleted` };
  }

  // --- Admin: update type for product ----------------------------
  @Patch(':id/type')
  @Roles(Role.ADMIN, Role.MOD)
  @ApiOperation({ summary: 'Update the type / category of a product (admin only)' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Category / type not found' })
  async updateTypeOfProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductTypeDto,
  ): Promise<MessageResponseDto> {
    await this.productService.updateCategory(id, dto.category);
    return { message: `Product type updated` };
  }

  // --- Any authenticated user: read + purchase ----------------------------

  @Get()
  @Public()
  @ApiOperation({
    summary:
      "List visible products (paginated). Excludes owned products if authenticated.",
  })
  @ApiOkResponse({ type: PaginatedProductsModel })
  findAll(
    @Query() query: QueryProductDto,
    @CurrentUser("id") userId?: string,
  ): Promise<PaginatedResult<ProductModel>> {
    return this.productService.findAll({ ...query }, userId);
  }

  @Get("app/:appId")
  @Public()
  @ApiOperation({ summary: "Get one product by Steam AppID (currently public / anonymous)" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not found or missing manifest" })
  findByAppId(@Param("appId", ParseIntPipe) appId: number): Promise<ProductModel> {
    return this.productService.findByAppId(appId);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get one product by id (UUID)" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not found or missing manifest" })
  findOne(@Param("id") id: string): Promise<ProductModel> {
    return this.productService.findOne(id);
  }

  @Post("purchase")
  @Roles(Role.CUSTOMER, Role.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary:
      "Purchase products (one or many) in a single transaction (requires Customer or Seller account)",
  })
  @ApiOkResponse({ type: [ProductModel] })
  @ApiNotFoundResponse({ description: "One or more products not available" })
  @ApiConflictResponse({ description: "One or more products already owned" })
  purchase(
    @Body() dto: PurchaseManyProductsDto,
    @CurrentUser("id") userId: string,
  ): Promise<ProductModel[]> {
    return this.productService.purchase(dto, userId);
  }
}
