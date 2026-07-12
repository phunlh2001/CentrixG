import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Data required to create a new user account (used by auth/register).
 * Lives under the `user` domain since it describes a new user.
 */
export class RegisterDto {
  @ApiProperty({ example: 'gaben', minLength: 3, maxLength: 32 })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username: string;

  @ApiProperty({ example: 'user@centrix.dev', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ss',
    minLength: 8,
    maxLength: 64,
    description:
      'Must contain at least one uppercase letter, one lowercase letter and one digit.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain uppercase, lowercase and numeric characters',
  })
  password: string;
}
