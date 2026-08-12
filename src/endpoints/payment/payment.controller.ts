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
      'Receive SePay IPN webhook notification and update order/bill status (authenticated via Bearer token and SePay secret)',
  })
  @ApiOkResponse({ type: SepayWebhookResponseModel })
  sepayWebhook(
    @Headers('authorization') authHeader: string,
    @Headers('x-sepay-secret') sepayHeader: string,
    @Body() dto: SepayWebhookDto,
  ): Promise<SepayWebhookResponseModel> {
    this.sepayService.verifyWebhookAuth(authHeader || sepayHeader);
    return this.sepayService.processWebhook(dto);
  }
}
