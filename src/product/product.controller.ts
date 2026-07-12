import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../prisma/prisma-client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import {
  BulkResultDto,
  MessageResponseDto,
} from "../common/dto/message-response.dto";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import {
  CreateManyProductsDto,
  CreateProductDto,
  DeleteManyProductsDto,
  QueryProductDto,
  UpdateProductDto,
} from "../shared/dto/product";
import { PaginatedProductsModel, ProductModel } from "../shared/models/product";
import { PaginatedResult, ProductService } from "./product.service";

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

  // --- Admin: write operations --------------------------------------------

  @Post("bulk")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Create many products in one transaction (admin)" })
  @ApiCreatedResponse({ type: [ProductModel] })
  @ApiConflictResponse({ description: "One or more appIds already exist" })
  createMany(@Body() dto: CreateManyProductsDto): Promise<ProductModel[]> {
    return this.productService.createMany(dto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Update a product / toggle visibility (admin)" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not found" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductModel> {
    return this.productService.update(id, dto);
  }

  @Delete("bulk")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Soft-delete many products (admin). Sets invisible = true.",
  })
  @ApiOkResponse({ type: BulkResultDto })
  async softDeleteMany(
    @Body() dto: DeleteManyProductsDto,
  ): Promise<BulkResultDto> {
    const count = await this.productService.softDeleteMany(dto);
    return { count, message: `${count} product(s) hidden` };
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Soft-delete a product (admin). Sets invisible = true.",
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: "Product not found" })
  async softDelete(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    await this.productService.softDelete(id);
    return { message: `Product ${id} hidden` };
  }

  // --- Any authenticated user: read + purchase ----------------------------

  @Get()
  @Public()
  @ApiOperation({ summary: "List visible products (paginated)" })
  @ApiOkResponse({ type: PaginatedProductsModel })
  findAll(
    @Query() query: QueryProductDto,
  ): Promise<PaginatedResult<ProductModel>> {
    return this.productService.findAll({ ...query });
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get one product by id" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not found" })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ProductModel> {
    return this.productService.findOne(id);
  }

  @Post(":id/purchase")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Purchase a product (adds it to the user library)" })
  @ApiOkResponse({ type: ProductModel })
  @ApiNotFoundResponse({ description: "Product not available" })
  @ApiConflictResponse({ description: "Product already owned" })
  purchase(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ): Promise<ProductModel> {
    return this.productService.purchase(userId, id);
  }
}
