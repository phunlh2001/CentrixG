import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Receive SePay IPN webhook notification (application/json, type incoming) with HMAC-SHA256 verification',
  })
  @ApiOkResponse({ type: SepayWebhookResponseModel })
  sepayWebhook(
    @Headers() headers: Record<string, string>,
    @Body() dto: SepayWebhookDto,
  ): Promise<SepayWebhookResponseModel> {
    const signature =
      headers['x-sepay-signature'] ||
      headers['x-signature'] ||
      headers['x-sepay-sha256'] ||
      headers['x-sepay-hmac'] ||
      headers['authorization'];

    this.sepayService.verifyHmacSignature(dto, signature);
    return this.sepayService.processWebhook(dto);
  }
}
