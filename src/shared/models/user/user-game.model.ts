import { ApiProperty } from '@nestjs/swagger';
import { ProductModel } from '../product/product.model';
import { ManifestModel } from '../manifest/manifest.model';

export class UserGameModel {
  @ApiProperty({ description: 'Purchased product details' })
  product: ProductModel;

  @ApiProperty({
    nullable: true,
    type: ManifestModel,
    description: 'Manifest details for the product (if available)',
  })
  manifest: ManifestModel | null;
}
