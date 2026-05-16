import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const req = host.switchToHttp().getRequest<Request>();
    const path = req?.originalUrl ?? req?.url ?? '(unknown)';
    const method = req?.method ?? '?';

    const res = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = error instanceof HttpException ? error.getResponse() : 'Internal server error';
    const message = typeof body === 'string' ? body : (body as { message?: unknown }).message ?? 'Request failed';

    if (status >= 500) {
      this.logger.error(`${method} ${path} → ${status}: ${String(message)}`, error instanceof Error ? error.stack : undefined);
    } else {
      this.logger.warn(`${method} ${path} → ${status}: ${String(message)}`);
    }

    res.status(status).json({
      error: {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
