import { ApiResponse } from '@app/shared/common/api-response';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps all controller return values in a consistent response envelope:
 * { success: true, statusCode, data, message }
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
    const response = httpCtx.getResponse();
    const statusCode = response?.statusCode || 200;

    return next.handle().pipe(
      map((resData: any) => {
        let msg = 'Operation completed successfully';
        let payload: any = resData;

        if (
          resData &&
          typeof resData === 'object' &&
          !Array.isArray(resData) &&
          'message' in resData &&
          typeof resData.message === 'string'
        ) {
          msg = resData.message;
          // If the return value only contained `{ message: '...' }`, set payload to null
          if (Object.keys(resData).length === 1) {
            payload = null;
          }
        }

        return {
          success: true,
          statusCode,
          data: payload !== undefined ? payload : null,
          message: msg,
        };
      }),
    );
  }
}
