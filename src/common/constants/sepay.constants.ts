/**
 * Configuration constants for SePay payment gateway and banking credentials.
 * Reads environment variables from .env to avoid exposing URLs or credentials in source code.
 */
export const SEPAY_CONFIG = {
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
  accountName: process.env.SEPAY_ACCOUNT_NAME || '',
  bankName: process.env.SEPAY_BANK_NAME || '',
  apiKey: process.env.SEPAY_API_KEY || '',
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || '',
  apiUrl: process.env.SEPAY_API_URL || '',
};
