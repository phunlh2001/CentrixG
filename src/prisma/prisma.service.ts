import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma-client';

/**
 * Thin wrapper around the Prisma 7 generated client that manages the
 * connection lifecycle within the Nest DI container. Acts as the single
 * data-access gateway (repository pattern) for every module.
 *
 * Prisma 7 no longer reads the connection URL from the schema — the runtime
 * client is driven by a driver adapter. Here we use `@prisma/adapter-pg`
 * (node-postgres) and feed it the URL from configuration.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg(config.getOrThrow<string>('DATABASE_URL')),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to the database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from the database');
  }
}
