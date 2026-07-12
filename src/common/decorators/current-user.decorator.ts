import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Extracts the authenticated user (attached by {@link JwtStrategy})
 * from the request. Optionally returns a single property.
 *
 * @example
 * findMe(@CurrentUser() user: AuthenticatedUser) {}
 * findMyId(@CurrentUser('id') id: string) {}
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      user: AuthenticatedUser;
    }>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
