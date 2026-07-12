import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible, bypassing the global JWT guard.
 *
 * @example
 * @Public()
 * @Post('login')
 * login() {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
