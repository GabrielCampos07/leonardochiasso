import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  // Raise JSON limit for local media complete (base64) when S3 is not configured.
  app.useBodyParser('json', { limit: '25mb' });

  app.use(
    helmet({
      contentSecurityPolicy: false, // API-only; CSP belongs on the SPA host
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  // Session cookie (lc_session) is read by the customer auth guard
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = (
    config.get<string>('CORS_ORIGINS') ?? 'http://localhost:4200'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Leo Chiasso API listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`CORS origins: ${origins.join(', ')}`);
}

bootstrap();
