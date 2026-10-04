import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { MailModule } from '../../../services/mail/mail.module';
import { AdminAffiliateController } from './admin-affiliate.controller';
import { AdminAffiliateService } from './admin-affiliate.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AdminAffiliateController],
  providers: [AdminAffiliateService],
  exports: [AdminAffiliateService],
})
export class AdminAffiliateModule {}
