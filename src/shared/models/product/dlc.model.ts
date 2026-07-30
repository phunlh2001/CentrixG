import { ApiProperty } from '@nestjs/swagger';

/**
 * Downloadable content belonging to a product.
 */
export class DlcModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 12345, description: 'Steam AppID of the DLC' })
  appId: number;

  @ApiProperty({ example: 'The Witcher 3: Blood and Wine' })
  name: string;

  @ApiProperty({ example: '9c1f...uuid', description: 'Parent product id' })
  productId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
