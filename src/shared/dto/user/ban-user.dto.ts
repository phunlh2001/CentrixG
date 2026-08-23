import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class BanUserDto {
  @ApiProperty({
    example: '9c1f7b8a-3d2e-4f1a-8c5b-6a7b8c9d0e1f',
    description: 'Target user ID to ban or unban',
  })
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    example: 'Violation of platform terms of service',
    description: 'Reason for banning the user',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Block status (true = ban, false = unban)',
  })
  @IsOptional()
  @IsBoolean()
  isBlock?: boolean = true;
}
