import { registerAs } from '@nestjs/config';
import { getServerEnv, type AppConfig } from './server-env';

export type { AppConfig } from './server-env';

/**
 * Nest `ConfigModule` registration. Values come from {@link getServerEnv}
 * (Zod + manual checks, fail-fast with readable errors).
 */
export const appConfig = registerAs('app', (): AppConfig => getServerEnv());
