import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { DailyStat } from './daily-stat.entity';
import { DailyStatsService } from './daily-stats.service';

@Module({
  controllers: [],
  exports: [DailyStatsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([DailyStat])],
  providers: [DailyStatsService],
})
export class DailyStatsModule {}
