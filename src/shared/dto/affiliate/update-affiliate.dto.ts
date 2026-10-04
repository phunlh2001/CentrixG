import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SocialChannelDto } from './social-channel.dto';

export class UpdateAffiliateDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ type: [SocialChannelDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialChannelDto)
  socialChannels?: SocialChannelDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promotionPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  achievements?: string;

  @ApiPropertyOptional({ example: 'Vietcombank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '0111000373824' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'NGUYEN VAN A' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  bankAccountName?: string;

  @ApiPropertyOptional({ example: 'GAMER99' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  @Matches(/^[A-Za-z0-9]{4,12}$/)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  offerCode?: string;
}
