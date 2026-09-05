import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  AdminBillPaginatedResponseModel,
  AdminBillQueryDto,
} from '@app/shared';
import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../../prisma/prisma-client';
import { BillService } from './bill.service';
import { MessageResponseDto } from '../../../common/dto/message-response.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MOD)
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
    description: 'Forbidden - Endpoint only accessible by ADMIN and MOD roles',
  })
  async getBills(
    @Query() query: AdminBillQueryDto,
  ): Promise<AdminBillPaginatedResponseModel> {
    return this.billService.findAll(query);
  }

  @Patch('refund/:id')
  @Roles(Role.ADMIN, Role.MOD)
  @ApiOperation({
    summary: 'Refund a completed bill/order and remove products from customer library',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Order / Bill not found' })
  @ApiBadRequestResponse({
    description: 'Order cannot be refunded (not completed or already refunded)',
  })
  @ApiUnauthorizedResponse({ description: 'Bearer token missing or invalid' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Endpoint only accessible by ADMIN and MOD roles',
  })
  async refundBill(@Param('id') id: string): Promise<MessageResponseDto> {
    return this.billService.refund(id);
  }
}

