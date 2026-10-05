import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/interfaces/authenticated-user.interface';
import { UserService } from '../../user/user.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CONFIG_ENV } from '@app/common/constants';

/**
 * Validates access tokens presented as `Authorization: Bearer <jwt>`.
 * Checks token session validity (revocation) and user account status.
 * Whatever this returns is attached to `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>(CONFIG_ENV.jwtAccessSecret),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 1. If access token contains a jti, check that the session has not been revoked
    if (payload.jti) {
      const activeSession = await this.prisma.token.findUnique({
        where: { token: payload.jti },
      });
      if (!activeSession) {
        throw new UnauthorizedException('Access token has been revoked');
      }
    }

    // 2. Confirm the subject still exists (handles deleted accounts).
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // 3. Reject blocked accounts
    if (user.isBlock) {
      throw new ForbiddenException(
        'Your account has been restricted by an administrator.',
      );
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlock,
      affiliate: payload.affiliate,
    };
  }
}
