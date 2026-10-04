import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Role } from '../../../prisma/prisma-client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  AdminAffiliatePaginatedResponseModel,
  AffiliateModel,
  QueryAffiliateDto,
  UpdateAffiliateDto,
  UpdateAffiliateStatusDto,
} from '@app/shared';
import { AdminAffiliateService } from './admin-affiliate.service';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MOD)
@Controller('admin/affiliate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAffiliateController {
  constructor(
    private readonly adminAffiliateService: AdminAffiliateService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get paginated affiliate applications list',
    description:
      'Retrieve affiliate partner applications with search and status filtering (PENDING, APPROVED, REJECTED). Returns reduced summary fields for efficient list display.',
  })
  @ApiOkResponse({
    type: AdminAffiliatePaginatedResponseModel,
    description: 'Paginated affiliate applications summary',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires ADMIN or MOD role' })
  findAll(
    @Query() query: QueryAffiliateDto,
  ): Promise<AdminAffiliatePaginatedResponseModel> {
    return this.adminAffiliateService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get affiliate application detail by ID',
    description:
      'Returns all application fields including personal details, social channels, promotion plan, achievements, bank account, and review information.',
  })
  @ApiOkResponse({
    type: AffiliateModel,
    description: 'Affiliate application detail with all fields and user account',
  })
  @ApiNotFoundResponse({ description: 'Affiliate registration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires ADMIN or MOD role' })
  findOne(@Param('id') id: string): Promise<AffiliateModel> {
    return this.adminAffiliateService.findOne(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or Reject an affiliate application',
    description:
      'Approving promotes the applicant account to SELLER and sends an email with partner privileges and active offer code. Rejecting sends an email explaining the review feedback.',
  })
  @ApiOkResponse({
    type: AffiliateModel,
    description: 'Updated affiliate registration',
  })
  @ApiBadRequestResponse({ description: 'Invalid status or input' })
  @ApiNotFoundResponse({ description: 'Affiliate registration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires ADMIN or MOD role' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAffiliateStatusDto,
    @CurrentUser() adminUser: AuthenticatedUser,
  ): Promise<AffiliateModel> {
    return this.adminAffiliateService.updateStatus(id, dto, adminUser);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update affiliate partner information (bank, contact, or offer code)',
  })
  @ApiOkResponse({
    type: AffiliateModel,
    description: 'Updated affiliate profile',
  })
  @ApiNotFoundResponse({ description: 'Affiliate registration not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires ADMIN or MOD role' })
  updateAffiliate(
    @Param('id') id: string,
    @Body() dto: UpdateAffiliateDto,
  ): Promise<AffiliateModel> {
    return this.adminAffiliateService.updateAffiliate(id, dto);
  }
}
