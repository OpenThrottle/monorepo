import { Module } from '@nestjs/common';
import { HealthGraphqlModule } from '../../graphql/health/health-graphql.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [HealthGraphqlModule],
})
export class HealthModule {}
