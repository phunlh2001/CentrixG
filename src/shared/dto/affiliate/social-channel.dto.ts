import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SocialChannelDto {
  @ApiProperty({
    example: 'YouTube',
    description: 'Social media platform (e.g. YouTube, TikTok, Instagram, Facebook)',
  })
  @IsNotEmpty()
  @IsString()
  platform: string;

  @ApiProperty({
    example: 'https://youtube.com/@channel',
    description: 'Channel URL or handle',
  })
  @IsNotEmpty()
  @IsString()
  url: string;
}
