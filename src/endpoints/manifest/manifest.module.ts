import { Module } from '@nestjs/common';
import { ManifestController } from './manifest.controller';
import { ManifestService } from './manifest.service';
import { SupabaseModule } from '../../services/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ManifestController],
  providers: [ManifestService],
  exports: [ManifestService],
})
export class ManifestModule {}
