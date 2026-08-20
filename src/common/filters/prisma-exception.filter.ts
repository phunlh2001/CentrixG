import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../prisma/prisma-client';
import { Request, Response } from 'express';

/**
 * Exception filter translating known Prisma database errors into HTTP responses
 * and logging full request context for deployment deployment error tracking.
 * Response format: { success: false, statusCode, data: null, message }
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation.
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        message = target
          ? `A record with this ${target} already exists`
          : 'Unique constraint violation';
        break;
      }
      case 'P2025': {
        // Record required but not found.
        status = HttpStatus.NOT_FOUND;
        message =
          (exception.meta?.cause as string | undefined) ?? 'Record not found';
        break;
      }
      case 'P2003': {
        // Foreign key constraint failed.
        status = HttpStatus.BAD_REQUEST;
        message = 'Related record constraint failed';
        break;
      }
      default: {
        message = `Database request error (${exception.code})`;
        break;
      }
    }

    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';

    const logMessage = `[PRISMA ERROR] Code: ${exception.code} (${status}) | ${request.method} ${request.url} | IP: ${clientIp} | Message: ${message}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logMessage, exception.stack);
    } else {
      this.logger.warn(logMessage);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      data: null,
      message,
    });
  }
}
