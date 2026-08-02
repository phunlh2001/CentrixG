import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './endpoints/auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './endpoints/product/product.module';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { AppController } from './app.controller';
import { TerminusModule } from '@nestjs/terminus';

import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from './services/mail/mail.module';
import { ManifestModule } from './endpoints/manifest/manifest.module';
import { UserModule } from './endpoints/user/user.module';
import { TokenModule } from './services/token/token.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
    UserModule,
    TokenModule,
    AuthModule,
    ProductModule,
    MailModule,
    ManifestModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaHealthIndicator,
    // Global authentication first, then role authorization.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Uniform success envelope.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Broad filter registered first; Prisma filter registered after so it
    // is evaluated first for Prisma-specific errors.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ]
})
export class AppModule {}
