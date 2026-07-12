import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RevokeTokenDto {
  @ApiProperty({
    example: 'a3f1c9...opaque-refresh-token',
    description: 'The refresh token to revoke (delete from the database).',
  })
  @IsString()
  @MinLength(1)
  refreshToken: string;
}
