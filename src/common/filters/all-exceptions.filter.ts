import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Catch-all exception filter ensuring all client & server errors are logged
 * with detailed context (IP, method, URL, status, message, stack trace)
 * and formatted into a uniform JSON response envelope:
 * { success: false, statusCode, data: null, message }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let rawMessage: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      rawMessage =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else if (exception instanceof Error) {
      rawMessage = exception.message;
    }

    const message = Array.isArray(rawMessage)
      ? rawMessage.join('; ')
      : rawMessage;

    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';
    const userAgent = request.headers['user-agent'] || 'none';
    const logPrefix = `${request.method} ${request.url} | IP: ${clientIp} | UA: "${userAgent}"`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // 5xx Server Errors -> Log as ERROR with full stack trace for tracking in production
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `[SERVER ERROR] ${status} | ${logPrefix} | Message: ${message}`,
        stack,
      );
    } else {
      // 4xx Client Errors -> Log as WARN to track client action failures
      this.logger.warn(
        `[CLIENT ERROR] ${status} | ${logPrefix} | Message: ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      data: null,
      message,
    });
  }
}
