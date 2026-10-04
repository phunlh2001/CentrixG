import { ApiProperty } from '@nestjs/swagger';
import { AdminAffiliateListItemModel } from './admin-affiliate-list-item.model';

export class AdminAffiliatePaginatedResponseModel {
  @ApiProperty({ type: [AdminAffiliateListItemModel] })
  items: AdminAffiliateListItemModel[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
