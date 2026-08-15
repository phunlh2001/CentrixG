import { Module } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { OverviewController } from './overview.controller';

@Module({
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService]
})
export class OverviewModule {}
