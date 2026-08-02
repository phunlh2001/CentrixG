import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload a manifest .zip file, save to Supabase Storage, and link manifestUrl to product',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['appId', 'file'],
      properties: {
        appId: {
          type: 'integer',
          example: 570,
          description: 'Steam AppID',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Steam manifest zip file (.zip)',
        },
      },
    },
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Product with AppID not found' })
  async uploadZipManifest(
    @Body('appId', ParseIntPipe) appId: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ManifestModel> {
    if (!file) {
      throw new BadRequestException('No file provided in form-data field "file"');
    }

    if (
      !file.originalname.toLowerCase().endsWith('.zip') &&
      !['application/zip', 'application/x-zip-compressed', 'application/x-compressed'].includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException('Uploaded file must be a .zip file');
    }

    return this.manifestService.uploadManifestFile(
      appId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post(':appId/upload')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload a manifest .zip file for AppID in path, save to Supabase Storage, and link manifestUrl to product',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Steam manifest zip file (.zip)',
        },
      },
    },
  })
  @ApiOkResponse({ type: ManifestModel })
  @ApiNotFoundResponse({ description: 'Product with AppID not found' })
  async uploadZipManifestByParam(
    @Param('appId', ParseIntPipe) appId: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ManifestModel> {
    if (!file) {
      throw new BadRequestException('No file provided in form-data field "file"');
    }

    if (
      !file.originalname.toLowerCase().endsWith('.zip') &&
      !['application/zip', 'application/x-zip-compressed', 'application/x-compressed'].includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException('Uploaded file must be a .zip file');
    }

    return this.manifestService.uploadManifestFile(
      appId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Patch(':appId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update or create manifestUrl for a Steam AppID directly',
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
