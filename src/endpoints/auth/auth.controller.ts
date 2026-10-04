import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessageResponseDto } from '../../common/dto/message-response.dto';
import { AuthService } from './auth.service';
import {
  AuthTokensDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RevokeTokenDto,
  UserModel,
  VerifyCodeDto,
} from '@app/shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Register a new customer account (unverified) and dispatch a 6-digit HTML email verification code via SMTP (valid 10 mins)',
  })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiConflictResponse({ description: 'Username or email already in use' })
  register(
    @Body() dto: RegisterDto,
    @Ip() ipAddress: string,
  ): Promise<MessageResponseDto> {
    return this.authService.register(dto, ipAddress || '127.0.0.1');
  }

  @Public()
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirm registration by submitting the 6-digit verification code within 10 minutes. If expired, removes account from DB.',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiBadRequestResponse({ description: 'Invalid verification code or code expired (>10 mins)' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  verifyCode(
    @Body() dto: VerifyCodeDto,
    @Ip() ipAddress: string,
  ): Promise<AuthTokensDto> {
    return this.authService.verifyCode(dto, ipAddress || '127.0.0.1');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access/refresh tokens' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password / Email unverified' })
  @ApiForbiddenResponse({ description: 'Account blocked or weekly login limit reached' })
  login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
  ): Promise<AuthTokensDto> {
    return this.authService.login(dto, ipAddress || '127.0.0.1');
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a valid refresh token for a new token pair',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired' })
  @ApiForbiddenResponse({ description: 'Account restricted by administrator' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ipAddress: string,
  ): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken, ipAddress || '127.0.0.1');
  }

  @Public()
  @Post('revoke-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke (delete) a refresh token' })
  @ApiOkResponse({ type: MessageResponseDto })
  async revoke(@Body() dto: RevokeTokenDto): Promise<MessageResponseDto> {
    await this.authService.revoke(dto.refreshToken);
    return { message: 'Refresh token revoked successfully' };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get profile information of currently authenticated user',
    description: 'Returns user profile including id, username, email, role, and totalEarn.',
  })
  @ApiOkResponse({
    type: UserModel,
    description: 'Current user profile with role and totalEarn',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  getMe(@CurrentUser('id') userId: string): Promise<UserModel> {
    return this.authService.getMe(userId);
  }
}
