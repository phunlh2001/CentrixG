import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CONFIG_ENV } from './common/constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableCors({
    origin: '*',
    methods: 'GET,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation: strip unknown props, reject extras, auto-transform.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix('api');
  // Note: no global route prefix — endpoints live at their bare paths
  // (/auth/*, /products/*) and Swagger UI owns /api.

  // --- Swagger / OpenAPI ---------------------------------------------------
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Centrix API')
    .setDescription(
      'Production-ready REST API for a SteamDB-style game catalog.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
        description: 'Paste the access token returned by /auth/login',
      },
      'access-token', // must match @ApiBearerAuth('access-token')
    )
    .addTag('Auth', 'Registration, login and token lifecycle')
    .addTag('Products', 'Game catalog CRUD and purchases')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerOptions: SwaggerCustomOptions = {
    swaggerOptions: { persistAuthorization: true },
  };
  // Served at /api (the global prefix path).
  SwaggerModule.setup('docs', app, document, swaggerOptions);

  const port = config.get<number>(CONFIG_ENV.port, 3000);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
