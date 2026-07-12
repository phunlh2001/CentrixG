import { Role } from '../../prisma/prisma-client';

/**
 * Shape of the user object attached to the request after JWT validation.
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: Role;
}

/**
 * Decoded access-token payload.
 */
export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
