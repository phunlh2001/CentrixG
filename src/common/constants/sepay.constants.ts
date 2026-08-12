/**
 * Configuration constants for SePay payment gateway and banking credentials.
 * Defaults match standard SePay Vietcombank merchant setup if env vars are omitted.
 */
export const SEPAY_CONFIG = {
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '0111000373824',
  accountName: process.env.SEPAY_ACCOUNT_NAME || 'LE THANH TUNG',
  bankName: process.env.SEPAY_BANK_NAME || 'Vietcombank',
  apiKey: process.env.SEPAY_API_KEY || '',
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || '',
};
