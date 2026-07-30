import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ManifestFile, Prisma } from '../../prisma/prisma-client';
import {
  CreateManifestDto,
  CreateManyManifestsDto,
  DeleteManyManifestsDto,
  ManifestModel,
  UpdateManifestDto,
} from '@app/shared';

@Injectable()
export class ManifestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves (creates) a single manifest and Lua script entry.
   */
  async save(dto: CreateManifestDto): Promise<ManifestModel> {
    await this.ensureProductExists(dto.appId);

    const manifest = await this.prisma.manifestFile.create({
      data: {
        appId: dto.appId,
        depotId: dto.depotId ?? null,
        manifestId: dto.manifestId ?? null,
        manifestData: dto.manifestData ?? null,
        luaScript: dto.luaScript ?? null,
        version: dto.version ?? 1,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    return this.toModel(manifest);
  }

  /**
   * Bulk saves/creates a list of manifest and Lua script entries in a single transaction.
   */
  async saveMany(dto: CreateManyManifestsDto): Promise<ManifestModel[]> {
    if (!dto.manifests || dto.manifests.length === 0) {
      throw new BadRequestException('Manifest list cannot be empty');
    }

    const appIds = Array.from(new Set(dto.manifests.map((m) => m.appId)));
    await this.ensureProductsExist(appIds);

    const created = await this.prisma.$transaction(async (tx) => {
      return Promise.all(
        dto.manifests.map((item) =>
          tx.manifestFile.create({
            data: {
              appId: item.appId,
              depotId: item.depotId ?? null,
              manifestId: item.manifestId ?? null,
              manifestData: item.manifestData ?? null,
              luaScript: item.luaScript ?? null,
              version: item.version ?? 1,
              isEnabled: item.isEnabled ?? true,
            },
          }),
        ),
      );
    });

    return created.map((m) => this.toModel(m));
  }

  /**
   * Retrieves all enabled manifest files associated with a Steam AppID.
   */
  async findAllByAppId(
    appId: number,
    includeDisabled: boolean = false,
  ): Promise<ManifestModel[]> {
    await this.ensureProductExists(appId);

    const manifests = await this.prisma.manifestFile.findMany({
      where: {
        appId,
        ...(includeDisabled ? {} : { isEnabled: true }),
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });

    return manifests.map((m) => this.toModel(m));
  }

  /**
   * Retrieves the active/enabled manifest and Lua script for a Steam AppID.
   */
  async findActiveByAppId(appId: number): Promise<ManifestModel> {
    await this.ensureProductExists(appId);

    const manifest = await this.prisma.manifestFile.findFirst({
      where: { appId, isEnabled: true },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });

    if (!manifest) {
      throw new NotFoundException(
        `Active manifest file for appId ${appId} not found`,
      );
    }

    return this.toModel(manifest);
  }

  /**
   * Updates an enabled manifest record for a given AppID.
   */
  async updateByAppId(
    appId: number,
    dto: UpdateManifestDto,
  ): Promise<ManifestModel> {
    await this.ensureProductExists(appId);

    const existing = await this.prisma.manifestFile.findFirst({
      where: { appId, isEnabled: true },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });

    if (!existing) {
      throw new NotFoundException(
        `No enabled manifest found to update for appId ${appId}`,
      );
    }

    const updated = await this.prisma.manifestFile.update({
      where: { id: existing.id },
      data: {
        ...(dto.depotId !== undefined && { depotId: dto.depotId }),
        ...(dto.manifestId !== undefined && { manifestId: dto.manifestId }),
        ...(dto.manifestData !== undefined && { manifestData: dto.manifestData }),
        ...(dto.luaScript !== undefined && { luaScript: dto.luaScript }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
      },
    });

    return this.toModel(updated);
  }

  /**
   * Updates a specific manifest record by its unique UUID ID.
   */
  async updateById(
    id: string,
    dto: UpdateManifestDto,
  ): Promise<ManifestModel> {
    const existing = await this.prisma.manifestFile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Manifest record ${id} not found`);
    }

    const updated = await this.prisma.manifestFile.update({
      where: { id },
      data: {
        ...(dto.depotId !== undefined && { depotId: dto.depotId }),
        ...(dto.manifestId !== undefined && { manifestId: dto.manifestId }),
        ...(dto.manifestData !== undefined && { manifestData: dto.manifestData }),
        ...(dto.luaScript !== undefined && { luaScript: dto.luaScript }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
      },
    });

    return this.toModel(updated);
  }

  /**
   * Soft deletes all manifest files for a Steam AppID by setting isEnabled = false.
   */
  async deleteByAppId(appId: number): Promise<{ count: number; message: string }> {
    await this.ensureProductExists(appId);

    const result = await this.prisma.manifestFile.updateMany({
      where: { appId, isEnabled: true },
      data: { isEnabled: false },
    });

    return {
      count: result.count,
      message: `Soft deleted ${result.count} manifest record(s) for appId ${appId}`,
    };
  }

  /**
   * Soft deletes a specific manifest record by setting isEnabled = false.
   */
  async deleteById(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.manifestFile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Manifest record ${id} not found`);
    }

    await this.prisma.manifestFile.update({
      where: { id },
      data: { isEnabled: false },
    });

    return { message: `Manifest record ${id} soft deleted successfully (isEnabled = false)` };
  }

  /**
   * Soft deletes a list of manifests specified by IDs or AppIDs.
   */
  async deleteMany(
    dto: DeleteManyManifestsDto,
  ): Promise<{ count: number; message: string }> {
    const hasIds = dto.ids && dto.ids.length > 0;
    const hasAppIds = dto.appIds && dto.appIds.length > 0;

    if (!hasIds && !hasAppIds) {
      throw new BadRequestException('Must provide either ids or appIds to delete');
    }

    const conditions: Prisma.ManifestFileWhereInput[] = [];
    if (hasIds) {
      conditions.push({ id: { in: dto.ids } });
    }
    if (hasAppIds) {
      conditions.push({ appId: { in: dto.appIds } });
    }

    const result = await this.prisma.manifestFile.updateMany({
      where: {
        isEnabled: true,
        OR: conditions,
      },
      data: { isEnabled: false },
    });

    return {
      count: result.count,
      message: `Soft deleted ${result.count} manifest record(s) (isEnabled = false)`,
    };
  }

  // --- Helpers -------------------------------------------------------------

  private async ensureProductExists(appId: number): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { appId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with Steam AppID ${appId} not found`);
    }
  }

  private async ensureProductsExist(appIds: number[]): Promise<void> {
    const found = await this.prisma.product.findMany({
      where: { appId: { in: appIds } },
      select: { appId: true },
    });

    const foundAppIds = new Set(found.map((p) => p.appId));
    const missing = appIds.filter((appId) => !foundAppIds.has(appId));

    if (missing.length > 0) {
      throw new NotFoundException(
        `Products with these AppIDs do not exist: ${missing.join(', ')}`,
      );
    }
  }

  private toModel(entity: ManifestFile): ManifestModel {
    return {
      id: entity.id,
      appId: entity.appId,
      depotId: entity.depotId,
      manifestId: entity.manifestId,
      manifestData: entity.manifestData,
      luaScript: entity.luaScript,
      version: entity.version,
      isEnabled: entity.isEnabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
