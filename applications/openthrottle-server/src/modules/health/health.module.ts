import { Module } from '@nestjs/common';

import { HealthGraphqlModule } from '../../graphql/health/health-graphql.module.ts';
import { HealthController } from './health.controller.ts';

@Module({
  controllers: [HealthController],
  imports: [HealthGraphqlModule],
})
export class HealthModule {}
