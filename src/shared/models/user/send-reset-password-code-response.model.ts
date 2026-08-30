import { ApiProperty } from '@nestjs/swagger';

export class SendResetPasswordCodeResponseModel {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({
    example: '$2b$10$abcdef123456...',
    description: 'Bcrypt hash of the 6-character reset verification code',
  })
  hashedCode: string;

  @ApiProperty({
    example: 'Reset verification code sent successfully to email',
  })
  message: string;
}

export { SendResetPasswordCodeResponseModel as SendResetCodeResponseModel };
