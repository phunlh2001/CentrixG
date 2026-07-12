import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically-secure opaque refresh-token string.
 * The value is stored (and looked up) verbatim in the Token table.
 */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('hex');
}
