import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ManifestModel, UpdateManifestDto } from '@app/shared';
import { ManifestService } from './manifest.service';

@ApiTags('Manifest')
@ApiBearerAuth('access-token')
@Controller('manifest')
export class ManifestController {
  constructor(private readonly manifestService: ManifestService) {}

  @Get(':appId')
  @Public()
  @ApiOperation({
    summary: 'Get manifestUrl for a Steam AppID',
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Manifest record not found' })
  findByAppId(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<ManifestModel> {
    return this.manifestService.findByAppId(appId);
  }

  @Patch(':appId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update or create manifestUrl for a Steam AppID',
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Product with AppID not found' })
  updateByAppId(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() dto: UpdateManifestDto,
  ): Promise<ManifestModel> {
    return this.manifestService.updateByAppId(appId, dto);
  }
}
