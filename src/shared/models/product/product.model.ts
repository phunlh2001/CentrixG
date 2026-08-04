import { ApiProperty } from '@nestjs/swagger';
import { DlcModel } from './dlc.model';
import { PricingModel } from './pricing.model';

/**
 * Representation of a product as returned by the API, including its complete
 * multi-currency pricing, DLCs, and categories.
 */
export class ProductModel {
  @ApiProperty({ example: '9c1f...uuid' })
  id: string;

  @ApiProperty({ example: 570 })
  appId: number;

  @ApiProperty({ example: 'Dota 2' })
  name: string;

  @ApiProperty({ nullable: true, example: 'A competitive game...' })
  description: string | null;

  @ApiProperty({ nullable: true, example: 'https://cdn.example.com/dota2.jpg' })
  imageUrl: string | null;

  @ApiProperty({
    type: PricingModel,
    description: 'Complete pricing across all supported currencies.',
  })
  pricing: PricingModel;

  @ApiProperty({ nullable: true, example: '2013-07-09T00:00:00.000Z' })
  releaseDate: Date | null;

  @ApiProperty({ nullable: true, example: 'Valve' })
  developer: string | null;

  @ApiProperty({ nullable: true, example: 'Valve' })
  publisher: string | null;

  @ApiProperty({
    type: [String],
    description: 'Categories associated with the product.',
    example: ['Action', 'Strategy', 'Single-player'],
  })
  categories: string[];

  @ApiProperty({ type: [String], example: ['windows', 'linux'] })
  platforms: string[];

  @ApiProperty({ type: [DlcModel], description: 'Downloadable content.' })
  dlcs: DlcModel[];

  @ApiProperty({ example: false, description: 'True if disabled from app display' })
  disabled: boolean;

  @ApiProperty({ example: false, description: 'True if soft-deleted' })
  isDelete: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
