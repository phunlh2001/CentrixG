import { Module } from '@nestjs/common';
import { ThirdPartyController } from './third-party.controller';
import { ThirdPartyService } from './third-party.service';

@Module({
  controllers: [ThirdPartyController],
  providers: [ThirdPartyService],
  exports: [ThirdPartyService],
})
export class ThirdPartyModule {}
