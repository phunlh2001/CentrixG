import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum OverviewPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class AdminOverviewQueryDto {
  @ApiPropertyOptional({
    enum: OverviewPeriod,
    example: OverviewPeriod.WEEKLY,
    description: 'Timeframe for analytics aggregate report (weekly or monthly)',
  })
  @IsOptional()
  @IsEnum(OverviewPeriod)
  period?: OverviewPeriod = OverviewPeriod.WEEKLY;
}
