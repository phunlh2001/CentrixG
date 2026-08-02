import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ManifestFile } from '../../prisma/prisma-client';
import { ManifestModel, UpdateManifestDto } from '@app/shared';
import { SupabaseStorageService } from '../../services/supabase/supabase-storage.service';

@Injectable()
export class ManifestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  /**
   * Retrieves the manifest record (manifestUrl) for a Steam AppID.
   */
  async findByAppId(appId: number): Promise<ManifestModel> {
    const manifest = await this.prisma.manifestFile.findUnique({
      where: { appId },
    });

    if (!manifest) {
      throw new NotFoundException(
        `Manifest record for Steam AppID ${appId} not found`,
      );
    }

    return this.toModel(manifest);
  }

  /**
   * Uploads a raw manifest file (e.g. large Steam manifest payload) to Supabase Storage
   * and saves the resulting public URL to manifest_files table.
   */
  async uploadManifestFile(
    appId: number,
    fileBuffer: Buffer,
    originalName: string,
    mimeType?: string,
  ): Promise<ManifestModel> {
    await this.ensureProductExists(appId);

    const publicUrl = await this.supabaseStorageService.uploadManifestFile(
      appId,
      fileBuffer,
      originalName,
      mimeType,
    );

    const manifest = await this.prisma.manifestFile.upsert({
      where: { appId },
      create: {
        appId,
        manifestUrl: publicUrl,
      },
      update: {
        manifestUrl: publicUrl,
      },
    });

    return this.toModel(manifest);
  }

  /**
   * Creates or updates the manifestUrl for a Steam AppID directly.
   */
  async updateByAppId(
    appId: number,
    dto: UpdateManifestDto,
  ): Promise<ManifestModel> {
    await this.ensureProductExists(appId);

    const manifest = await this.prisma.manifestFile.upsert({
      where: { appId },
      create: {
        appId,
        manifestUrl: dto.manifestUrl ?? null,
      },
      update: {
        ...(dto.manifestUrl !== undefined && { manifestUrl: dto.manifestUrl }),
      },
    });

    return this.toModel(manifest);
  }

  private async ensureProductExists(appId: number): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { appId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with Steam AppID ${appId} not found`,
      );
    }
  }

  private toModel(entity: ManifestFile): ManifestModel {
    return {
      id: entity.id,
      appId: entity.appId,
      manifestUrl: entity.manifestUrl ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
