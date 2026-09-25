import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma/prisma-client';
import { ManifestModel, StorageProvider, UpdateManifestDto } from '@app/shared';
import { SupabaseStorageService } from '../../services/supabase/supabase-storage.service';
import { R2StorageService } from '../../services/r2/r2-storage.service';

const MANIFEST_INCLUDE = {
  product: {
    select: { name: true },
  },
} satisfies Prisma.ManifestFileInclude;

type ManifestWithProduct = Prisma.ManifestFileGetPayload<{
  include: typeof MANIFEST_INCLUDE;
}>;

@Injectable()
export class ManifestService {
  private readonly logger = new Logger(ManifestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseStorageService: SupabaseStorageService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  /**
   * Retrieves the manifest record (manifestUrl) and product name for a Steam AppID,
   * optionally with storage provider awareness.
   */
  async findByAppId(
    appId: number,
    storage?: StorageProvider,
  ): Promise<ManifestModel> {
    const manifest = await this.prisma.manifestFile.findUnique({
      where: { appId },
      include: MANIFEST_INCLUDE,
    });

    if (!manifest) {
      throw new NotFoundException(
        `Manifest record for Steam AppID ${appId} not found`,
      );
    }

    return this.toModel(manifest, storage);
  }

  /**
   * Uploads a raw manifest file (e.g. large Steam manifest payload) to selected storage (R2 or Supabase)
   * and saves the resulting URL to manifest_files table.
   */
  async uploadManifestFile(
    appId: number,
    fileBuffer: Buffer,
    originalName: string,
    mimeType?: string,
    storage: StorageProvider = StorageProvider.R2,
  ): Promise<ManifestModel> {
    await this.ensureProductExists(appId);

    // Retrieve existing manifest to clean up previous file from target storage
    const existing = await this.prisma.manifestFile.findUnique({
      where: { appId },
    });

    const storageService = this.getStorageService(storage);

    // Clean up older file for this AppID in target storage before uploading new version
    if (existing?.manifestUrl) {
      await storageService.deleteManifestsByAppId(appId, existing.manifestUrl);
    }

    const publicUrl = await storageService.uploadManifestFile(
      appId,
      fileBuffer,
      originalName,
      mimeType,
    );

    const [manifest] = await this.prisma.$transaction([
      this.prisma.manifestFile.upsert({
        where: { appId },
        create: {
          appId,
          manifestUrl: publicUrl,
        },
        update: {
          manifestUrl: publicUrl,
        },
        include: MANIFEST_INCLUDE,
      }),
      this.prisma.product.update({
        where: { appId },
        data: { disabled: true },
      }),
    ]);

    this.logger.log(
      `Manifest uploaded for AppID ${appId} using [${storage}]: ${publicUrl}`,
    );

    return this.toModel(manifest, storage);
  }

  /**
   * Downloads a manifest file as a Buffer from the specified or auto-detected storage provider.
   */
  async downloadManifest(
    appId: number,
    storage?: StorageProvider,
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const manifest = await this.prisma.manifestFile.findUnique({
      where: { appId },
    });

    if (!manifest) {
      throw new NotFoundException(
        `Manifest record for Steam AppID ${appId} not found`,
      );
    }

    const effectiveStorage =
      storage || this.detectStorageProvider(manifest.manifestUrl);
    const storageService = this.getStorageService(effectiveStorage);

    const buffer = await storageService.downloadManifestBuffer(
      appId,
      manifest.manifestUrl || undefined,
    );

    return {
      buffer,
      fileName: `manifest_${appId}.zip`,
      contentType: 'application/zip',
    };
  }

  /**
   * Generates a direct or presigned download URL from the specified or auto-detected storage provider.
   */
  async getDownloadUrl(
    appId: number,
    storage?: StorageProvider,
    expiresInSeconds = 3600,
  ): Promise<{ downloadUrl: string; storage: StorageProvider }> {
    const manifest = await this.prisma.manifestFile.findUnique({
      where: { appId },
    });

    if (!manifest) {
      throw new NotFoundException(
        `Manifest record for Steam AppID ${appId} not found`,
      );
    }

    const effectiveStorage =
      storage || this.detectStorageProvider(manifest.manifestUrl);
    const storageService = this.getStorageService(effectiveStorage);

    const downloadUrl = await storageService.getManifestDownloadUrl(
      appId,
      manifest.manifestUrl || undefined,
      expiresInSeconds,
    );

    return {
      downloadUrl,
      storage: effectiveStorage,
    };
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
      include: MANIFEST_INCLUDE,
    });

    return this.toModel(manifest, dto.storage);
  }

  /**
   * Deletes manifest file(s) for a Steam AppID from storage (R2, Supabase, or both)
   * and optionally deletes the database record.
   */
  async deleteByAppId(
    appId: number,
    storage?: StorageProvider | 'all',
  ): Promise<{ message: string; deletedFrom: string }> {
    const manifest = await this.prisma.manifestFile.findUnique({
      where: { appId },
    });

    if (storage === StorageProvider.R2) {
      await this.r2StorageService.deleteManifestsByAppId(
        appId,
        manifest?.manifestUrl,
      );
      if (
        manifest &&
        this.detectStorageProvider(manifest.manifestUrl) === StorageProvider.R2
      ) {
        await this.prisma.manifestFile.update({
          where: { appId },
          data: { manifestUrl: null },
        });
      }
      return {
        message: `Deleted manifest files for AppID ${appId} from Cloudflare R2`,
        deletedFrom: StorageProvider.R2,
      };
    }

    if (storage === StorageProvider.SUPABASE) {
      await this.supabaseStorageService.deleteManifestsByAppId(
        appId,
        manifest?.manifestUrl,
      );
      if (
        manifest &&
        this.detectStorageProvider(manifest.manifestUrl) ===
          StorageProvider.SUPABASE
      ) {
        await this.prisma.manifestFile.update({
          where: { appId },
          data: { manifestUrl: null },
        });
      }
      return {
        message: `Deleted manifest files for AppID ${appId} from Supabase Storage`,
        deletedFrom: StorageProvider.SUPABASE,
      };
    }

    // Default or 'all': Clean up from BOTH storages and remove DB record
    await Promise.allSettled([
      this.r2StorageService.deleteManifestsByAppId(appId, manifest?.manifestUrl),
      this.supabaseStorageService.deleteManifestsByAppId(
        appId,
        manifest?.manifestUrl,
      ),
    ]);

    await this.prisma.manifestFile.deleteMany({
      where: { appId },
    });

    return {
      message: `Deleted manifest files for AppID ${appId} from all storages and removed database record`,
      deletedFrom: 'all',
    };
  }

  /**
   * Resolves the storage service instance corresponding to the selected provider.
   */
  private getStorageService(provider: StorageProvider) {
    switch (provider) {
      case StorageProvider.SUPABASE:
        return this.supabaseStorageService;
      case StorageProvider.R2:
      default:
        return this.r2StorageService;
    }
  }

  /**
   * Detects storage provider based on manifestUrl content, defaulting to R2.
   */
  private detectStorageProvider(manifestUrl?: string | null): StorageProvider {
    if (!manifestUrl) return StorageProvider.R2;
    if (manifestUrl.includes('supabase.co')) {
      return StorageProvider.SUPABASE;
    }
    if (
      manifestUrl.includes('r2.cloudflarestorage.com') ||
      manifestUrl.includes('.r2.dev')
    ) {
      return StorageProvider.R2;
    }
    return StorageProvider.R2;
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

  private toModel(
    entity: ManifestWithProduct,
    explicitStorage?: StorageProvider,
  ): ManifestModel {
    const storage =
      explicitStorage || this.detectStorageProvider(entity.manifestUrl);

    return {
      id: entity.id,
      appId: entity.appId,
      name: entity.product?.name ?? '',
      manifestUrl: entity.manifestUrl ?? null,
      storage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
