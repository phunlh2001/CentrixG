import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CONFIG_ENV } from '../../common/constants';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly s3Client: S3Client;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucketName: string;
  private readonly publicDomain?: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>(CONFIG_ENV.r2Endpoint);
    const accessKeyId = this.configService.get<string>(CONFIG_ENV.r2AccessKeyId);
    const secretAccessKey = this.configService.get<string>(
      CONFIG_ENV.r2SecretAccessKey,
    );
    const bucketName = this.configService.get<string>(CONFIG_ENV.r2BucketName);

    // Strictly enforce presence of all required environment variables without defaults
    if (!endpoint) {
      throw new InternalServerErrorException(
        'Missing R2_ENDPOINT in environment variables. No default value permitted.',
      );
    }
    if (!accessKeyId) {
      throw new InternalServerErrorException(
        'Missing R2_ACCESS_KEY_ID in environment variables. No default value permitted.',
      );
    }
    if (!secretAccessKey) {
      throw new InternalServerErrorException(
        'Missing R2_SECRET_ACCESS_KEY in environment variables. No default value permitted.',
      );
    }
    if (!bucketName) {
      throw new InternalServerErrorException(
        'Missing R2_BUCKET_NAME in environment variables. No default value permitted.',
      );
    }

    this.endpoint = endpoint;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.bucketName = bucketName;
    this.publicDomain = this.configService.get<string>(
      CONFIG_ENV.r2PublicDomain,
    );

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });

    this.logger.log(
      `Initialized Cloudflare R2 storage client for bucket: ${this.bucketName}`,
    );
  }

  /**
   * Uploads a Steam manifest file buffer to Cloudflare R2 bucket.
   * Returns the accessible URL of the uploaded object.
   */
  async uploadManifestFile(
    appId: number,
    fileBuffer: Buffer,
    originalName: string,
    mimeType?: string,
  ): Promise<string> {
    const fileExt = originalName.includes('.')
      ? originalName.split('.').pop()
      : 'zip';
    const filePath = `${appId}/${Date.now()}_manifest.${fileExt}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: fileBuffer,
        ContentType: mimeType || 'application/zip',
      });

      await this.s3Client.send(command);

      const fileUrl = this.publicDomain
        ? `${this.publicDomain.replace(/\/+$/, '')}/${filePath}`
        : `${this.endpoint.replace(/\/+$/, '')}/${this.bucketName}/${filePath}`;

      this.logger.log(
        `Successfully uploaded manifest for AppID ${appId} to R2: ${fileUrl}`,
      );

      return fileUrl;
    } catch (error: any) {
      this.logger.error(
        `Failed to upload manifest to Cloudflare R2: ${error?.message || error}`,
      );
      throw new BadRequestException(
        `Failed to upload manifest to Cloudflare R2: ${error?.message || error}`,
      );
    }
  }

  /**
   * Deletes all manifest files associated with a Steam AppID from Cloudflare R2 bucket.
   * Also extracts and removes specific path from manifestUrl if provided.
   */
  async deleteManifestsByAppId(
    appId: number,
    manifestUrl?: string | null,
  ): Promise<void> {
    try {
      const pathsToDelete = new Set<string>();

      // 1. List objects under folder prefix `${appId}/`
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `${appId}/`,
      });

      const listResponse = await this.s3Client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        for (const item of listResponse.Contents) {
          if (item.Key) {
            pathsToDelete.add(item.Key);
          }
        }
      }

      // 2. Extract path from manifestUrl if provided and not yet included
      if (manifestUrl) {
        const extractedPath = this.extractStoragePath(manifestUrl);
        if (extractedPath) {
          pathsToDelete.add(extractedPath);
        }
      }

      // 3. Remove files from R2 bucket if any were identified
      if (pathsToDelete.size > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: Array.from(pathsToDelete).map((key) => ({ Key: key })),
            Quiet: false,
          },
        });

        const deleteResponse = await this.s3Client.send(deleteCommand);

        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
          this.logger.error(
            `Failed to remove some manifest files for AppID ${appId} from R2 bucket ${this.bucketName}: ${JSON.stringify(
              deleteResponse.Errors,
            )}`,
          );
        } else {
          this.logger.log(
            `Successfully deleted ${pathsToDelete.size} manifest file(s) for AppID ${appId} from R2 bucket ${this.bucketName}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Error during Cloudflare R2 manifest deletion for AppID ${appId}: ${err?.message || err}`,
      );
    }
  }

  /**
   * Downloads a manifest file as a Buffer from Cloudflare R2 for in-memory extraction or processing.
   */
  async downloadManifestBuffer(
    appId: number,
    manifestUrl?: string,
  ): Promise<Buffer> {
    const key = await this.resolveObjectKey(appId, manifestUrl);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new BadRequestException(
          `Empty response body for R2 object: ${key}`,
        );
      }

      const stream = response.Body as any;
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);
      this.logger.log(
        `Successfully downloaded manifest buffer (${fileBuffer.length} bytes) for AppID ${appId} from R2 [${key}]`,
      );

      return fileBuffer;
    } catch (err: any) {
      this.logger.error(
        `Failed to download manifest for AppID ${appId} from R2: ${err?.message || err}`,
      );
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException(
        `Failed to download manifest from Cloudflare R2: ${err?.message || err}`,
      );
    }
  }

  /**
   * Generates a secure, time-limited presigned download URL for a manifest file in Cloudflare R2.
   */
  async getManifestDownloadUrl(
    appId: number,
    manifestUrl?: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const key = await this.resolveObjectKey(appId, manifestUrl);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      this.logger.log(
        `Generated presigned download URL for AppID ${appId} [${key}] valid for ${expiresInSeconds}s`,
      );

      return presignedUrl;
    } catch (err: any) {
      this.logger.error(
        `Failed to generate presigned download URL for AppID ${appId}: ${err?.message || err}`,
      );
      throw new BadRequestException(
        `Failed to generate presigned download URL from Cloudflare R2: ${err?.message || err}`,
      );
    }
  }

  /**
   * Extracts relative storage path inside bucket from a full URL or path string.
   */
  extractStoragePath(urlOrPath: string): string | null {
    if (!urlOrPath) return null;

    if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
      let cleaned = urlOrPath.replace(/^\/+/, '');
      if (cleaned.startsWith(`${this.bucketName}/`)) {
        cleaned = cleaned.slice(this.bucketName.length + 1);
      }
      return cleaned;
    }

    try {
      const parsedUrl = new URL(urlOrPath);
      const pathname = decodeURIComponent(parsedUrl.pathname);
      const bucketMarker = `/${this.bucketName}/`;
      const bucketIndex = pathname.indexOf(bucketMarker);
      if (bucketIndex !== -1) {
        return pathname
          .slice(bucketIndex + bucketMarker.length)
          .replace(/^\/+/, '');
      }

      // If URL does not contain bucketMarker, strip leading slash
      return pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
  }

  /**
   * Resolves the target object key for an AppID, either from manifestUrl or latest object under `${appId}/`.
   */
  private async resolveObjectKey(
    appId: number,
    manifestUrl?: string,
  ): Promise<string> {
    if (manifestUrl) {
      const extracted = this.extractStoragePath(manifestUrl);
      if (extracted) return extracted;
    }

    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: `${appId}/`,
    });

    const listResponse = await this.s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      throw new NotFoundException(
        `No manifest file found in Cloudflare R2 for Steam AppID ${appId}`,
      );
    }

    const sorted = listResponse.Contents.filter((item) => item.Key).sort(
      (a, b) =>
        (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0),
    );

    const latestKey = sorted[0]?.Key;
    if (!latestKey) {
      throw new NotFoundException(
        `No valid manifest key found in Cloudflare R2 for Steam AppID ${appId}`,
      );
    }

    return latestKey;
  }
}
