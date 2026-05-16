import 'reflect-metadata';
import * as os from 'node:os';
import helmet from 'helmet';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppConfig } from './core/config/app.config';
import { EnvValidationError, getServerEnv } from './core/config/server-env';
import { ApiErrorFilter } from './common/errors/api-error.filter';
import { logHttpRequests } from './core/http-request-logger.middleware';

async function bootstrap(): Promise<void> {
  try {
    getServerEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();
  expressInstance.use(logHttpRequests);

  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');
  if (config.nodeEnv === 'production' || config.nodeEnv === 'development') {
    Logger.log(
      `DB env source=${config.databaseEnv.source} host=${config.databaseEnv.host} user=${config.databaseEnv.user} database=${config.databaseEnv.database} port=${config.databaseEnv.port} sslmode=${config.databaseEnv.sslmode}`,
      'Bootstrap',
    );
  }

  app.use(helmet());
  const corsAllowAll =
    config.nodeEnv !== 'production' && config.corsOrigins.length === 0;
  if (corsAllowAll) {
    app.enableCors({ origin: true, credentials: true });
  } else {
    app.enableCors({
      credentials: true,
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    });
  }
  if (config.apiPrefix) {
    app.setGlobalPrefix(config.apiPrefix);
  }
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalFilters(new ApiErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Schede Fitness API')
    .setDescription('Workout generation, execution, progression and coach platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.port, '0.0.0.0');
  const route = config.apiPrefix ? `/${config.apiPrefix}/v1` : '/v1';
  const healthPath = `${route}/health`;
  const lanUrls: string[] = [];
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        lanUrls.push(`http://${net.address}:${config.port}${healthPath}`);
      }
    }
  }
  const uniqueLan = [...new Set(lanUrls)];
  Logger.log(
    `Backend listening on http://0.0.0.0:${config.port}${route} — try health: ${uniqueLan.join(' | ') || 'http://<LAN-IP>:' + config.port + healthPath}`,
    'Bootstrap',
  );
}

void bootstrap();

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Process] unhandledRejection', reason);
});
process.on('uncaughtException', (err: Error) => {
  console.error('[Process] uncaughtException', err?.stack ?? err);
});
