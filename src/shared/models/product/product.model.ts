import { ApiProperty } from '@nestjs/swagger';
import { DlcModel } from './dlc.model';
import { PricingModel } from './pricing.model';

export class ProductTypeInfoModel {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Rockstar' })
  name: string;
}

/**
 * Representation of a product as returned by the API, including its complete
 * multi-currency pricing, DLCs, categories, type, and manifest download URL.
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

  @ApiProperty({
    nullable: true,
    type: ProductTypeInfoModel,
    description: 'Type / Category associated with the product (containing id and name)',
  })
  type?: ProductTypeInfoModel | null;

  @ApiProperty({ type: [String], example: ['windows', 'linux'] })
  platforms: string[];

  @ApiProperty({ type: [DlcModel], description: 'Downloadable content.' })
  dlcs: DlcModel[];

  @ApiProperty({
    nullable: true,
    example: 'https://cdn.example.com/manifests/570.zip',
    description: 'Steam manifest file URL linked by AppID',
  })
  manifestUrl: string | null;

  @ApiProperty({ example: false, description: 'True if disabled from app display' })
  disabled: boolean;

  @ApiProperty({ example: false, description: 'True if soft-deleted' })
  isDelete: boolean;

  @ApiProperty({ example: false, description: 'True if product has Denuvo DRM protection' })
  isDenuvo: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
