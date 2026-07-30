import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString } from 'class-validator';

/**
 * Input for a DLC, used when creating a product with its DLCs.
 * `productId` and timestamps are assigned by the server.
 */
export class CreateDlcDto {
  @ApiProperty({ example: 355880, description: 'Unique Steam AppID of the DLC' })
  @IsInt()
  @IsPositive()
  appId: number;

  @ApiProperty({ example: 'The Witcher 3: Blood and Wine' })
  @IsString()
  name: string;
}
