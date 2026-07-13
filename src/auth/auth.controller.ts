import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { AuthService } from './auth.service';
import { AuthTokensDto, LoginDto, RefreshTokenDto, RegisterDto, RevokeTokenDto } from '@app/shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiCreatedResponse({ type: AuthTokensDto })
  @ApiConflictResponse({ description: 'Username or email already in use' })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access/refresh tokens' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a valid refresh token for a new token pair',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken);
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
}
