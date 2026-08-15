import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@app/prisma/prisma-client';
import { AdminCategoryModel } from '@app/shared';

@ApiTags("Admin Category")
@ApiBearerAuth("access-token")
@Roles(Role.ADMIN, Role.MOD)
@Controller('admin/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all categories (restricted to ADMIN and MOD roles)',
  })
  @ApiOkResponse({ type: [AdminCategoryModel] })
  @ApiForbiddenResponse({
    description: 'Only ADMIN or MOD role accounts can access categories',
  })
  getAllCategories(): Promise<AdminCategoryModel[]> {
    return this.categoryService.findAll();
  }
}
