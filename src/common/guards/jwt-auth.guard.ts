import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard backed by the Passport "jwt" strategy.
 * Routes decorated with {@link Public} are allowed through unauthenticated,
 * but if a valid Bearer token is provided in the headers, request.user will be populated.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      try {
        await super.canActivate(context);
      } catch {
        // Ignore authentication errors for public/optional endpoints
      }
      return true;
    }

    return (await super.canActivate(context)) as boolean;
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return (user ?? null) as TUser;
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }

    return user as TUser;
  }
}
