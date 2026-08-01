/**
 * Standard envelope wrapping every API response (both success and error).
 */
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data: T | null;
  message: string;
}