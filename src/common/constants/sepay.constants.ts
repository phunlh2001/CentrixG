/**
 * Configuration constants for SePay payment gateway and banking credentials.
 * Reads environment variables from .env to avoid exposing URLs or credentials in source code.
 */
export const SEPAY_CONFIG = {
  accountNumber: 'SEPAY_ACCOUNT_NUMBER',
  accountName: 'SEPAY_ACCOUNT_NAME',
  bankName: 'SEPAY_BANK_NAME',
  apiKey: 'SEPAY_API_KEY',
  webhookSecret: 'SEPAY_WEBHOOK_SECRET',
  apiUrl: 'SEPAY_API_URL',
};
