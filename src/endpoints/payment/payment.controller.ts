import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  SepayWebhookDto,
  SepayWebhookResponseModel,
} from '@app/shared';
import { SepayService } from './sepay.service';

@ApiTags('Payment')
@ApiBearerAuth('access-token')
@Controller('payment')
export class PaymentController {
  constructor(private readonly sepayService: SepayService) {}

  @Post('sepay-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Receive SePay IPN webhook notification and update order/bill status (requires Bearer token)',
  })
  @ApiOkResponse({ type: SepayWebhookResponseModel })
  sepayWebhook(
    @Body() dto: SepayWebhookDto,
  ): Promise<SepayWebhookResponseModel> {
    return this.sepayService.processWebhook(dto);
  }
}
