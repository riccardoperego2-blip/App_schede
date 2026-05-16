import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const httpLogger = new Logger('HTTP');

/** Logs every HTTP request when mounted on the Express instance (method, URL, status, duration). */
export function logHttpRequests(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    httpLogger.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
}
