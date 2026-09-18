import { Module } from '@nestjs/common';
import { ManifestController } from './manifest.controller';
import { ManifestService } from './manifest.service';
import { SupabaseModule } from '../../services/supabase/supabase.module';
import { R2Module } from '../../services/r2/r2.module';

@Module({
  imports: [SupabaseModule, R2Module],
  controllers: [ManifestController],
  providers: [ManifestService],
  exports: [ManifestService],
})
export class ManifestModule {}
