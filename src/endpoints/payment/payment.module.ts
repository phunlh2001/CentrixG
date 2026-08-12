import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { SepayService } from './sepay.service';

@Module({
  controllers: [PaymentController],
  providers: [SepayService],
  exports: [SepayService],
})
export class PaymentModule {}
