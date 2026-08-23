import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 100000, description: 'Order amount in VND' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: 'aef481a7-97d9-4f65-a829-e10288d09d88',
    description: 'Target product ID for this order (required)',
  })
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  productId: string;
}
