/**
 * Configuration constants for SePay payment gateway and banking credentials.
 * Reads environment variables from .env to avoid exposing URLs or credentials in source code.
 */
export const SEPAY_CONFIG = {
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '0111000373824',
  accountName: process.env.SEPAY_ACCOUNT_NAME || 'LE THANH TUNG',
  bankName: process.env.SEPAY_BANK_NAME || 'Vietcombank',
  apiKey: process.env.SEPAY_API_KEY || '',
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || '',
  apiUrl: process.env.SEPAY_API_URL || '',
};
