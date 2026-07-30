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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../prisma/prisma-client';
import { BulkResultDto, MessageResponseDto } from '../../common/dto/message-response.dto';
import { ManifestService } from './manifest.service';
import {
  CreateManifestDto,
  CreateManyManifestsDto,
  DeleteManyManifestsDto,
  ManifestModel,
  UpdateManifestDto,
} from '@app/shared';

@ApiTags('Manifests')
@ApiBearerAuth('access-token')
@Controller('manifests')
export class ManifestController {
  constructor(private readonly manifestService: ManifestService) {}

  // --- Public Write Operations (Temporarily Public) -----------------------

  @Post()
  @Public() // Temporarily public
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Save/create a single manifest and Lua script entry (temporarily public)',
  })
  @ApiCreatedResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Product with specified AppID not found' })
  save(@Body() dto: CreateManifestDto): Promise<ManifestModel> {
    return this.manifestService.save(dto);
  }

  @Post('bulk')
  @Public() // Temporarily public
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Bulk save/create a list of manifest and Lua script records in a single transaction (temporarily public)',
  })
  @ApiCreatedResponse({ type: [ManifestModel] })
  @ApiNotFoundResponse({ description: 'One or more AppIDs not found' })
  saveMany(@Body() dto: CreateManyManifestsDto): Promise<ManifestModel[]> {
    return this.manifestService.saveMany(dto);
  }

  // --- Read Operations ----------------------------------------------------

  @Get(':appId')
  @Public()
  @ApiOperation({
    summary: 'Get all enabled manifest files and Lua scripts for a Steam AppID',
  })
  @ApiOkResponse({ type: [ManifestModel] })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findAllByAppId(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<ManifestModel[]> {
    return this.manifestService.findAllByAppId(appId);
  }

  @Get(':appId/active')
  @Public()
  @ApiOperation({
    summary: 'Get active/enabled manifest and Lua script for a Steam AppID',
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Active manifest file not found' })
  findActiveByAppId(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<ManifestModel> {
    return this.manifestService.findActiveByAppId(appId);
  }

  // --- Update Operations --------------------------------------------------

  @Patch(':appId')
  @Public() // Temporarily public
  @ApiOperation({
    summary: 'Update active manifest or Lua script for a Steam AppID',
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Manifest or product not found' })
  updateByAppId(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() dto: UpdateManifestDto,
  ): Promise<ManifestModel> {
    return this.manifestService.updateByAppId(appId, dto);
  }

  @Patch('id/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a specific manifest record by UUID id (admin)',
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Manifest record not found' })
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManifestDto,
  ): Promise<ManifestModel> {
    return this.manifestService.updateById(id, dto);
  }

  // --- Soft Delete Operations (isEnabled = false) ------------------------

  @Delete('bulk')
  @Public() // Temporarily public
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Bulk soft delete a list of manifests by record IDs or AppIDs (sets isEnabled = false)',
  })
  @ApiOkResponse({ type: BulkResultDto })
  deleteMany(
    @Body() dto: DeleteManyManifestsDto,
  ): Promise<BulkResultDto> {
    return this.manifestService.deleteMany(dto);
  }

  @Delete(':appId')
  @Public() // Temporarily public
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft delete all manifest files for a Steam AppID (sets isEnabled = false)',
  })
  @ApiOkResponse({ type: BulkResultDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  deleteByAppId(
    @Param('appId', ParseIntPipe) appId: number,
  ): Promise<BulkResultDto> {
    return this.manifestService.deleteByAppId(appId);
  }

  @Delete('id/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft delete a specific manifest record by UUID id (sets isEnabled = false)',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Manifest record not found' })
  deleteById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return this.manifestService.deleteById(id);
  }
}
