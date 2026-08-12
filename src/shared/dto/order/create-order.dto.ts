import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 100000, description: 'Order amount in VND' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
