/**
 * @description Module that provides NotificationsService for emitting
 * notification events (plan.updated, task.completed, queue.job.completed, system.alert)
 * over graphql-ws PubSub. Provides EMIT_NOTIFICATION_EMITTER so
 * EmitNotificationInterceptor can emit via NotificationsService.
 */

import { Module } from '@nestjs/common';
import { EMIT_NOTIFICATION_EMITTER } from '@openthrottle/nestjs-websockets';
import { NotificationEmitterAdapter } from './notification-emitter.adapter';
import { NotificationsService } from './notifications.service';

@Module({
  exports: [NotificationsService, EMIT_NOTIFICATION_EMITTER],
  providers: [
    // NotificationEmitterAdapter,
    NotificationsService,
    {
      provide: EMIT_NOTIFICATION_EMITTER,
      useClass: NotificationEmitterAdapter,
    },
  ],
})
export class NotificationsModule {}
