import { Controller, Get, Query } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/prisma/prisma-client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AdminOverviewQueryDto, AdminOverviewResponseModel } from '@app/shared';

@ApiTags('Admin Overview')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MOD)
@Controller('admin/overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get admin platform analytics overview (restricted to ADMIN and MOD roles)',
  })
  @ApiOkResponse({ type: AdminOverviewResponseModel })
  @ApiForbiddenResponse({
    description: 'Only ADMIN or MOD role accounts can access analytics overview',
  })
  getOverview(
    @Query() query: AdminOverviewQueryDto,
  ): Promise<AdminOverviewResponseModel> {
    return this.overviewService.getOverview(query.period);
  }
}
