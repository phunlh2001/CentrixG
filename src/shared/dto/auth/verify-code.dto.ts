import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@centrix.dev', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit email verification code' })
  @IsString()
  @Length(6, 6)
  code: string;
}
