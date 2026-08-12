import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateOrderDto,
  CreateOrderResponseModel,
  OrderStatusResponseModel,
} from '@app/shared';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Generate orderCode and banking QR code info for SePay payment (requires Bearer token)',
  })
  @ApiCreatedResponse({ type: CreateOrderResponseModel })
  createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId?: string,
  ): Promise<CreateOrderResponseModel> {
    return this.ordersService.createOrder(dto, userId);
  }

  @Get(':orderCode')
  @ApiOperation({
    summary:
      'Check order and bill status by orderCode for polling (requires Bearer token)',
  })
  @ApiOkResponse({ type: OrderStatusResponseModel })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getOrderStatus(
    @Param('orderCode') orderCode: string,
  ): Promise<OrderStatusResponseModel> {
    return this.ordersService.getOrderStatus(orderCode);
  }
}
