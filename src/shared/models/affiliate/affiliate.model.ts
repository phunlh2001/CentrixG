import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialChannelDto } from '../../dto/affiliate/social-channel.dto';
import { AdminAffiliateListItemModel } from './admin-affiliate-list-item.model';

export class AffiliateModel extends AdminAffiliateListItemModel {
  @ApiProperty({ type: [SocialChannelDto] })
  socialChannels: SocialChannelDto[];

  @ApiProperty({ example: 'Kế hoạch quảng bá trên YouTube...' })
  promotionPlan: string;

  @ApiProperty({ example: 'Kênh TikTok 50k followers...' })
  achievements: string;

  @ApiProperty({ example: 'Vietcombank' })
  bankName: string;

  @ApiProperty({ example: '0111000373824' })
  bankAccountNumber: string;

  @ApiProperty({ example: 'NGUYEN VAN A' })
  bankAccountName: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  rejectionReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 'admin_user' })
  reviewedBy?: string | null;
}
