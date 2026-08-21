import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  AdminBillPaginatedResponseModel,
  AdminBillQueryDto,
} from '@app/shared';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../../prisma/prisma-client';
import { BillService } from './bill.service';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller('admin/bill')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated bills list for admin dashboard',
  })
  @ApiOkResponse({ type: AdminBillPaginatedResponseModel })
  @ApiUnauthorizedResponse({ description: 'Bearer token missing or invalid' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Endpoint only accessible by ADMIN role',
  })
  async getBills(
    @Query() query: AdminBillQueryDto,
  ): Promise<AdminBillPaginatedResponseModel> {
    return this.billService.findAll(query);
  }
}
