import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG_ENV } from '../../common/constants';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient | null = null;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>(CONFIG_ENV.supabaseUrl);
    const supabaseKey =
      this.configService.get<string>(CONFIG_ENV.supabaseSecretKey) ||
      this.configService.get<string>(CONFIG_ENV.supabasePublishableKey);
    this.bucketName =
      this.configService.get<string>(CONFIG_ENV.supabaseManifestBucket) ||
      'manifests';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      this.logger.log(
        `Initialized Supabase storage client for bucket: ${this.bucketName}`,
      );
    } else {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SECRET_KEY not configured in environment. Storage upload disabled.',
      );
    }
  }

  /**
   * Uploads a Steam manifest file buffer to Supabase Storage bucket.
   * Returns the public URL of the uploaded object.
   */
  async uploadManifestFile(
    appId: number,
    fileBuffer: Buffer,
    originalName: string,
    mimeType?: string,
  ): Promise<string> {
    if (!this.supabase) {
      throw new BadRequestException(
        'Supabase Storage is not configured. Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.',
      );
    }

    const fileExt = originalName.includes('.')
      ? originalName.split('.').pop()
      : 'zip';
    const filePath = `${appId}/${Date.now()}_manifest.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, fileBuffer, {
        contentType: mimeType || 'application/zip',
        upsert: true,
      });

    if (error) {
      this.logger.error(`Failed to upload manifest to Supabase: ${error.message}`);
      throw new BadRequestException(
        `Failed to upload manifest to Supabase: ${error.message}`,
      );
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    this.logger.log(
      `Successfully uploaded manifest for AppID ${appId}: ${publicUrlData.publicUrl}`,
    );
    return publicUrlData.publicUrl;
  }
}
