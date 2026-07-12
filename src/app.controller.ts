import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";

@Controller('health')
@Public()
export class AppController {
  constructor(
    private _health: HealthCheckService,
    private _prismaIndicator: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this._health.check([
      () => this._prismaIndicator.isHealthy("database"),
    ]);
  }
}
