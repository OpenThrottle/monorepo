/**
 * @description Module that provides NotificationsService for emitting WebSocket
 * notification events (plan.updated, task.completed, queue.job.completed, system.alert).
 * Depends on NestjsWebsocketsModule for the Socket.IO server. Provides
 * EMIT_NOTIFICATION_EMITTER so EmitNotificationInterceptor can emit via NotificationsService.
 */

import { Module } from '@nestjs/common';
import {
  EMIT_NOTIFICATION_EMITTER,
  NestjsWebsocketsModule,
} from '@openthrottle/nestjs-websockets';
import { NotificationEmitterAdapter } from './notification-emitter.adapter';
import { NotificationsService } from './notifications.service';

@Module({
  exports: [NotificationsService, EMIT_NOTIFICATION_EMITTER],
  imports: [NestjsWebsocketsModule],
  providers: [
    NotificationEmitterAdapter,
    NotificationsService,
    {
      provide: EMIT_NOTIFICATION_EMITTER,
      useClass: NotificationEmitterAdapter,
    },
  ],
})
export class NotificationsModule {}
