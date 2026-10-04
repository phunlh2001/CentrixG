import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AffiliateStatus } from '../../enums/affiliate-status.enum';

export class AdminAffiliateListItemModel {
  @ApiProperty({ example: 'b3f5...uuid' })
  id: string;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiPropertyOptional({ example: 'Kaizz', description: 'Tên đăng nhập của tài khoản' })
  username?: string;

  @ApiPropertyOptional({ example: 'phunlh0169@gmail.com', description: 'Địa chỉ email tài khoản' })
  email?: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName: string;

  @ApiProperty({ example: '0912345678' })
  phoneNumber: string;

  @ApiProperty({ example: 'GAMER99' })
  offerCode: string;

  @ApiProperty({ example: 150000, description: 'Tổng hoa hồng tích lũy (VND)' })
  totalEarn: number;

  @ApiProperty({ enum: AffiliateStatus, example: AffiliateStatus.PENDING })
  status: AffiliateStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
