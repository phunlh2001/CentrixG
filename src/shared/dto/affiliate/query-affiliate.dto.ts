import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AffiliateStatus } from '../../enums/affiliate-status.enum';

export class QueryAffiliateDto {
  @ApiPropertyOptional({
    enum: AffiliateStatus,
    description: 'Filter applications by review status (PENDING, APPROVED, REJECTED)',
  })
  @IsOptional()
  @IsEnum(AffiliateStatus)
  status?: AffiliateStatus;

  @ApiPropertyOptional({
    description: 'Search by username, email, fullName, phoneNumber, or offerCode',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}
