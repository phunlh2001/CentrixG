/**
 * Standard envelope wrapping every successful response.
 */
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
}