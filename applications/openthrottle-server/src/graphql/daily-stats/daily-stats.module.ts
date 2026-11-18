import { Module } from '@nestjs/common';
import { DailyStatsModule } from '@openthrottle/nestjs-repositories-server';

import { DailyStatsResolver } from './daily-stats.resolver.ts';

/**
 * @description GraphQL module for daily stats. Imports DailyStatsModule for DailyStatsRepository.
 */
@Module({
  imports: [DailyStatsModule],
  providers: [DailyStatsResolver],
})
export class DailyStatsGraphqlModule {}
