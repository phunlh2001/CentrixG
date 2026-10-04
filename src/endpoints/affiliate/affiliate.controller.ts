import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AffiliateModel, ApplyAffiliateDto } from '@app/shared';
import { AffiliateService } from './affiliate.service';

@ApiTags('Affiliate')
@Controller('affiliate')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Post('apply')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit affiliate partner registration or resubmit after rejection',
    description:
      'Creates a new affiliate application in PENDING status. If the applicant was previously REJECTED, updates their existing record and resets status to PENDING for re-evaluation.',
  })
  @ApiOkResponse({
    type: AffiliateModel,
    description: 'Submitted affiliate registration',
  })
  @ApiBadRequestResponse({
    description: 'User is already an approved partner or has a pending application',
  })
  @ApiConflictResponse({
    description: 'Chosen offer code is already taken by another affiliate',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized or missing Bearer token',
  })
  apply(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ApplyAffiliateDto,
  ): Promise<AffiliateModel> {
    return this.affiliateService.apply(currentUser, dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current user affiliate profile and application status',
  })
  @ApiOkResponse({
    type: AffiliateModel,
    description: 'Affiliate profile, or null if no application exists',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized or missing Bearer token',
  })
  getMyAffiliate(
    @CurrentUser('id') userId: string,
  ): Promise<AffiliateModel | null> {
    return this.affiliateService.getMyAffiliate(userId);
  }

  @Get('check-code/:code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if an offer code is available and valid',
    description:
      'Validates 4 to 12 alphanumeric characters and checks uniqueness in real time.',
  })
  @ApiOkResponse({
    description: 'Availability status and friendly message',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean', example: true },
        code: { type: 'string', example: 'GAMER99' },
        message: { type: 'string', example: "Offer code 'GAMER99' is available!" },
      },
    },
  })
  checkCode(
    @Param('code') code: string,
  ): Promise<{ available: boolean; code: string; message: string }> {
    return this.affiliateService.checkCodeAvailability(code);
  }
}
