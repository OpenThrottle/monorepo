import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { DailyStatsResolver } from './daily-stats.resolver';

/**
 * @description GraphQL module for daily stats. Imports NestjsRepositoriesModule for DailyStatsService.
 */
@Module({
  imports: [NestjsRepositoriesModule],
  providers: [DailyStatsResolver],
})
export class DailyStatsGraphqlModule {}
