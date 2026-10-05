import { Role } from '../../prisma/prisma-client';

export interface JwtAffiliatePayload {
  totalEarn: number;
  offerCode?: string;
}

/**
 * Decoded access-token payload embedding user identity and partner credentials.
 */
export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: Role;
  isBlocked: boolean;
  affiliate: JwtAffiliatePayload;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Shape of the user object attached to the request after JWT validation.
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  isBlocked?: boolean;
  affiliate?: JwtAffiliatePayload;
}
