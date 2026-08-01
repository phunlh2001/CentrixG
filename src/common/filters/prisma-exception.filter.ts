import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../prisma/prisma-client';
import { Response } from 'express';

/**
 * Translates known Prisma errors into meaningful HTTP responses in the exact format:
 * { success: false, statusCode, data: null, message }
 *
 * Reference: https://www.prisma.io/docs/orm/reference/error-reference
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
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
        );
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      data: null,
      message,
    });
  }
}
