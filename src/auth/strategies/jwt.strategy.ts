import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { UserService } from '../../user/user.service';
import { CONFIG_ENV } from '@app/common/constants';

/**
 * Validates access tokens presented as `Authorization: Bearer <jwt>`.
 * Whatever this returns is attached to `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>(CONFIG_ENV.jwtAccessSecret),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Confirm the subject still exists (handles deleted accounts).
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }
}
