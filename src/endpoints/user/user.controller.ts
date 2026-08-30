import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserService } from './user.service';
import {
  ResetPasswordDto,
  SendResetCodeResponseModel,
  SendResetPasswordCodeDto,
  UserGameModel,
} from '@app/shared';
import { MessageResponseDto } from '../../common/dto/message-response.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('games')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all purchased games for the currently authenticated user from library',
  })
  @ApiOkResponse({
    type: [UserGameModel],
    description: 'List of purchased games with product and manifest details',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized or missing Bearer token',
  })
  getUserGames(@CurrentUser('id') userId: string): Promise<UserGameModel[]> {
    return this.userService.getUserGames(userId);
  }

  @Post('send-reset-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Send a 6-character verification code to user email for password reset',
  })
  @ApiOkResponse({
    type: SendResetCodeResponseModel,
    description:
      'Verification code sent successfully to email and hashed code returned',
  })
  @ApiNotFoundResponse({
    description: 'User with this email not found',
  })
  @ApiBadRequestResponse({
    description: 'Account is blocked or email is invalid',
  })
  sendResetPasswordCode(
    @Body() dto: SendResetPasswordCodeDto,
  ): Promise<SendResetCodeResponseModel> {
    return this.userService.sendResetPasswordCode(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reset user password using the 6-character code and hashed verification code',
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Password has been reset successfully',
  })
  @ApiNotFoundResponse({
    description: 'User with this email not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification code',
  })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.userService.resetPassword(dto);
  }
}
