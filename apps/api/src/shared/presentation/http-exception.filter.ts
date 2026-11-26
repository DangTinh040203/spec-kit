import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { NotFoundError } from '../domain/not-found.error.js';
import { ValidationError, type ValidationIssue } from '../domain/validation.error.js';

type ErrorCode = 'VALIDATION_ERROR' | 'MALFORMED_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR';

interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: ValidationIssue[] };
}

/**
 * Turns every error into the single contract format (FR-019, FR-022). It knows only the shared
 * base errors, never feature errors.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, body] = this.toResponse(exception);
    response.status(status).json(body);
  }

  private toResponse(exception: unknown): [number, ErrorBody] {
    if (exception instanceof ValidationError) {
      return [
        HttpStatus.BAD_REQUEST,
        { error: { code: 'VALIDATION_ERROR', message: exception.message, details: exception.details } },
      ];
    }
    if (exception instanceof NotFoundError) {
      return [HttpStatus.NOT_FOUND, { error: { code: 'NOT_FOUND', message: exception.message } }];
    }
    if (isBodyParseError(exception)) {
      return [
        HttpStatus.BAD_REQUEST,
        { error: { code: 'MALFORMED_REQUEST', message: 'The request body could not be parsed.' } },
      ];
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.NOT_FOUND) {
        return [status, { error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } }];
      }
      if (status >= 400 && status < 500) {
        return [status, { error: { code: 'MALFORMED_REQUEST', message: 'The request could not be processed.' } }];
      }
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' } },
    ];
  }
}

/** body-parser marks unparsable JSON with type "entity.parse.failed"; Nest may wrap it. */
function isBodyParseError(exception: unknown): boolean {
  const candidates = [exception, exception instanceof HttpException ? exception.cause : undefined];
  return candidates.some(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      (('type' in value && value.type === 'entity.parse.failed') || value instanceof SyntaxError),
  );
}
