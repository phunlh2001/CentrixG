import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThirdPartyFileUrlModel } from '@app/shared';

@Injectable()
export class ThirdPartyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches a single third-party file URL object for Ubisoft platform.
   */
  async getUbisoftFileUrl(): Promise<ThirdPartyFileUrlModel> {
    const record = await this.prisma.thirdParty.findFirst({
      where: {
        type: {
          name: {
            equals: 'Ubisoft',
            mode: 'insensitive',
          },
        },
      },
      select: {
        fileUrl: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Third-party file URL for Ubisoft was not found');
    }

    return {
      fileUrl: record.fileUrl,
    };
  }

  /**
   * Fetches a list of third-party file URLs for Rockstar platform.
   */
  async getRockstarFileUrl(appId: number): Promise<ThirdPartyFileUrlModel> {
    const records = await this.prisma.thirdParty.findMany({
      where: {
        type: {
          name: {
            equals: 'Rockstar',
            mode: 'insensitive',
          },
        }
      },
      select: {
        fileUrl: true,
      },
    });

    const record = records
      .map((r) => {
        const url = r.fileUrl;
        const { pathname } = new URL(url);
        const fileName = decodeURIComponent(pathname.split('/').pop() || '');
        const gameId = parseInt(fileName.replace(/\.zip$/i, ''), 10);

        return {
          gameId,
          url
        }
      })
      .find((u) => u.gameId === appId);

    if (!record) {
      throw new NotFoundException(`Third-party file URL for Rockstar (App ID: ${appId}) was not found`);
    }

    return {
      fileUrl: record.url,
    }
  }
}
