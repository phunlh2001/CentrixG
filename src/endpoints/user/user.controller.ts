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
import { UserGameModel } from '@app/shared';

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('games')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get all purchased games for the currently authenticated user from library',
  })
  @ApiOkResponse({
    type: [UserGameModel],
    description: 'List of purchased games with product and manifest details',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or missing Bearer token' })
  getUserGames(@CurrentUser('id') userId: string): Promise<UserGameModel[]> {
    return this.userService.getUserGames(userId);
  }
}
