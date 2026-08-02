import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('games')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all rented games (user_games) for the currently authenticated user',
  })
  @ApiOkResponse({
    description: 'List of rented games with product and manifest details',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  getUserGames(@CurrentUser('id') userId: string) {
    return this.userService.getUserGames(userId);
  }
}
