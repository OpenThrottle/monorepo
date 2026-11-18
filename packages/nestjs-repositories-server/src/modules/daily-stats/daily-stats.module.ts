import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyStat } from './daily-stat.entity.ts';
import { DailyStatsRepository } from './daily-stats.repository.ts';

/**
 * @description Registers {@link DailyStat} on the default connection and provides
 * {@link DailyStatsRepository}.
 * @public
 */
@Module({
  exports: [DailyStatsRepository],
  imports: [TypeOrmModule.forFeature([DailyStat])],
  providers: [DailyStatsRepository],
})
export class DailyStatsModule {}
