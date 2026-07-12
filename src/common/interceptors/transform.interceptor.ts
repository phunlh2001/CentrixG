import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard envelope wrapping every successful response.
 */
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  path: string;
  timestamp: string;
  data: T;
}

/**
 * Wraps controller return values in a consistent response envelope.
 * Errors are left untouched so exception filters can format them.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const statusCode = httpCtx.getResponse<{ statusCode: number }>().statusCode;

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode,
        path: request.url,
        // ISO timestamp; deterministic construction avoids surprises in tests.
        timestamp: new Date().toISOString(),
        data,
      })),
    );
  }
}
