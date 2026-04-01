import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsWorktreesModule } from '@openthrottle/nestjs-worktrees';
import { MetricsModule } from '../../metrics/metrics.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PLANS_QUEUE_NAME } from './plans.constants';
import { PlansProcessor } from './plans.processor';

@Module({
  exports: [BullModule],
  imports: [
    LoggerModule,
    MetricsModule,
    NestjsBullmqModule.registerQueue(PLANS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLANS_QUEUE_NAME),
    NestjsRepositoriesModule,
    NestjsWorktreesModule,
    NotificationsModule,
  ],
  providers: [PlansProcessor],
})
export class PlansQueueModule {}
