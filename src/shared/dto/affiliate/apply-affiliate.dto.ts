import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SocialChannelDto } from './social-channel.dto';

export class ApplyAffiliateDto {
  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'Họ và tên đầy đủ của người đăng ký',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName: string;

  @ApiProperty({
    example: '0912345678',
    description: 'Số điện thoại liên hệ',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phoneNumber: string;

  @ApiProperty({
    type: [SocialChannelDto],
    description: 'Danh sách các kênh truyền thông & mạng xã hội',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải cung cấp ít nhất 1 kênh truyền thông hoặc mạng xã hội' })
  @ValidateNested({ each: true })
  @Type(() => SocialChannelDto)
  socialChannels: SocialChannelDto[];

  @ApiProperty({
    example: 'Làm video review game trên YouTube và livestream trên TikTok...',
    description: 'Kế hoạch & phương thức quảng bá sản phẩm',
  })
  @IsNotEmpty({ message: 'Kế hoạch quảng bá không được để trống' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  promotionPlan: string;

  @ApiProperty({
    example: 'Kênh TikTok 50k followers, video review đạt 20k views...',
    description: 'Thành tích hoặc dự án đã từng làm (portfolio / links)',
  })
  @IsNotEmpty({ message: 'Thành tích/dự án không được để trống' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  achievements: string;

  @ApiProperty({
    example: 'Vietcombank',
    description: 'Tên ngân hàng nhận hoa hồng',
  })
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bankName: string;

  @ApiProperty({
    example: '0111000373824',
    description: 'Số tài khoản ngân hàng',
  })
  @IsNotEmpty({ message: 'Số tài khoản ngân hàng không được để trống' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bankAccountNumber: string;

  @ApiProperty({
    example: 'NGUYEN VAN A',
    description: 'Tên chủ tài khoản ngân hàng (in hoa)',
  })
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  bankAccountName: string;

  @ApiProperty({
    example: 'GAMER99',
    description:
      'Mã ưu đãi tự chọn từ 4 đến 12 ký tự chữ hoặc số, không dấu, không khoảng trắng',
  })
  @IsNotEmpty({ message: 'Mã ưu đãi không được để trống' })
  @IsString()
  @MinLength(4, { message: 'Mã ưu đãi phải có ít nhất 4 ký tự' })
  @MaxLength(12, { message: 'Mã ưu đãi tối đa 12 ký tự' })
  @Matches(/^[A-Za-z0-9]{4,12}$/, {
    message: 'Mã ưu đãi chỉ gồm 4-12 ký tự chữ hoặc số (A-Z, 0-9), không chứa ký tự đặc biệt',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  offerCode: string;
}
