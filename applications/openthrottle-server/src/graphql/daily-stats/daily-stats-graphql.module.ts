import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { DailyStatsResolver } from './daily-stats.resolver';

/**
 * @description GraphQL module for daily stats. Imports NestjsRepositoriesModule for DailyStatsService.
 */
@Module({
  imports: [NestjsRepositoriesModule],
  providers: [DailyStatsResolver],
})
export class DailyStatsGraphqlModule {}
