/**
 * @description Adapter that implements {@link EmitNotificationEmitter} from @openthrottle/nestjs-websockets
 * by delegating to NotificationsService. Maps event names from {@link NOTIFICATION_EVENT_NAMES}
 * to the corresponding emit methods so the EmitNotificationInterceptor can use this as the injectable emitter.
 */

import type { EmitNotificationEmitter } from '@openthrottle/nestjs-websockets';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/*
 * `EmitNotificationEmitter.emit(event, payload)` is a fixed cross-package
 * interface with `payload: unknown`. Each branch forwards a trusted resolver
 * payload (produced by the EmitNotificationInterceptor) to the matching typed
 * NotificationsService method; the interface signature cannot be narrowed here.
 */
/* eslint-disable @typescript-eslint/consistent-type-assertions -- fixed EmitNotificationEmitter interface passes payload: unknown; forwarded to the matching typed emit method (see note above) */

@Injectable()
export class NotificationEmitterAdapter implements EmitNotificationEmitter {
  constructor(private readonly notifications: NotificationsService) {}

  emit(event: string, payload: unknown): void {
    switch (event) {
      case NOTIFICATION_EVENT_NAMES.DEBUG:
        this.notifications.emitDebug(
          payload as Parameters<NotificationsService['emitDebug']>[0],
        );
        break;

      case NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED:
        this.notifications.emitPlanStatusChanged(
          payload as Parameters<
            NotificationsService['emitPlanStatusChanged']
          >[0],
        );
        break;

      case NOTIFICATION_EVENT_NAMES.PLAN_UPDATED:
        this.notifications.emitPlanUpdated(
          payload as Parameters<NotificationsService['emitPlanUpdated']>[0],
        );
        break;

      case NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED:
        this.notifications.emitQueueJobCompleted(
          payload as Parameters<
            NotificationsService['emitQueueJobCompleted']
          >[0],
        );
        break;

      case NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT:
        this.notifications.emitSystemAlert(
          payload as Parameters<NotificationsService['emitSystemAlert']>[0],
        );
        break;

      case NOTIFICATION_EVENT_NAMES.TASK_COMPLETED:
        this.notifications.emitTaskCompleted(
          payload as Parameters<NotificationsService['emitTaskCompleted']>[0],
        );
        break;

      case NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED:
        this.notifications.emitTaskStatusChanged(
          payload as Parameters<
            NotificationsService['emitTaskStatusChanged']
          >[0],
        );
        break;

      default:
        // Unknown event: no-op so resolvers can use custom events later if needed
        break;
    }
  }
}
