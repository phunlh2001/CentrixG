import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address associated with the account',
  })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Invalid email address format' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-character verification code received in email',
  })
  @IsNotEmpty({ message: 'Verification code cannot be empty' })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  code: string;

  @ApiProperty({
    example: 'NewSecretPass123@',
    description: 'New password for the account (minimum 6 characters)',
  })
  @IsNotEmpty({ message: 'New password cannot be empty' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword: string;
}
