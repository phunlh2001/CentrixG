import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AffiliateStatus } from '../../enums/affiliate-status.enum';

export class UpdateAffiliateStatusDto {
  @ApiProperty({
    enum: [AffiliateStatus.APPROVED, AffiliateStatus.REJECTED],
    example: AffiliateStatus.APPROVED,
    description: 'Trạng thái xét duyệt (APPROVED hoặc REJECTED)',
  })
  @IsNotEmpty()
  @IsEnum(AffiliateStatus)
  status: AffiliateStatus;

  @ApiPropertyOptional({
    example: 'Kênh truyền thông không đủ lượng tương tác tối thiểu hoặc thông tin tài khoản không hợp lệ.',
    description: 'Lý do từ chối (bắt buộc nếu status = REJECTED)',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
