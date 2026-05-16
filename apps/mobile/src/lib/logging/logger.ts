/**
 * Thin structured logger. Production builds should pipe these to Sentry / Datadog.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
}

function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (__DEV__) {
    const tag = `[${level.toUpperCase()}]`;
    if (level === 'error') console.error(tag, message, context);
    else if (level === 'warn') console.warn(tag, message, context);
    else console.log(tag, message, context);
  }
}

export const logger: Logger = {
  debug: (m, c) => emit('debug', m, c),
  info: (m, c) => emit('info', m, c),
  warn: (m, c) => emit('warn', m, c),
  error: (m, e, c) => emit('error', m, { error: serializeError(e), ...c }),
};

function serializeError(error: unknown): Record<string, unknown> | unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}
