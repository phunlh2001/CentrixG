import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'a3f1c9...opaque-refresh-token',
    description: 'The opaque refresh token issued at login.',
  })
  @IsString()
  @MinLength(1)
  refreshToken: string;
}
