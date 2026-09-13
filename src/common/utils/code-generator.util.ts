import { randomInt } from 'crypto';

const OFFER_CODE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an unambiguous, cryptographically-strong uppercase alphanumeric offer code.
 * Excludes easily confused characters (0, O, 1, I).
 * Default length is 6 characters.
 */
export function generateOfferCode(length = 12): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, OFFER_CODE_CHARSET.length);
    code += OFFER_CODE_CHARSET[index];
  }
  return code;
}
