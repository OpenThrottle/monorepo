import { Controller, Get } from '@nestjs/common';
import { Public } from '@openthrottle/nestjs-auth';
import type { ServerHealthResponse } from '../../graphql/health/health.service';
import { HealthService } from '../../graphql/health/health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * @description Returns server health: API (ok when invoked), Cortex DB,
   * and Redis. Same shape as GraphQL serverHealth.
   */
  @Get()
  async check(): Promise<ServerHealthResponse> {
    return this.healthService.getServerHealth();
  }
}
