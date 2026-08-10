import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ThirdPartyFileUrlModel } from '@app/shared';
import { ThirdPartyService } from './third-party.service';

@ApiTags('ThirdParty')
@ApiBearerAuth('access-token')
@Controller('third-party')
export class ThirdPartyController {
  constructor(private readonly thirdPartyService: ThirdPartyService) {}

  /**
   * Get single third-party fileUrl for Ubisoft (private API)
   */
  @Get('ubisoft')
  @ApiOperation({
    summary: 'Get single third-party fileUrl for Ubisoft (private API)',
  })
  @ApiOkResponse({
    type: ThirdPartyFileUrlModel,
    description: 'Ubisoft fileUrl object',
  })
  @ApiNotFoundResponse({
    description: 'Third-party file URL for Ubisoft not found',
  })
  getUbisoftFileUrl(): Promise<ThirdPartyFileUrlModel> {
    return this.thirdPartyService.getUbisoftFileUrl();
  }

  /**
   * Get list of third-party fileUrls for Rockstar (private API)
   */
  @Get('rockstar')
  @ApiOperation({
    summary: 'Get list of third-party fileUrls for Rockstar (private API)',
  })
  @ApiOkResponse({
    type: [ThirdPartyFileUrlModel],
    description: 'List of Rockstar fileUrl items',
  })
  getRockstarFileUrls(): Promise<ThirdPartyFileUrlModel[]> {
    return this.thirdPartyService.getRockstarFileUrls();
  }
}
