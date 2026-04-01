/**
 * @description Central service to emit notification events over the WebSocket (Socket.IO)
 * so the openthrottle-developer app can consume them. Uses the shared event names and
 * payload shapes from @openthrottle/openthrottle-notifications.
 */

import type {
  DebugPayload,
  NotificationSeverity,
  PlanEnqueuedPayload,
  PlanStatusChangedPayload,
  PlanUpdatedPayload,
  PlanWaitingForWorktreePayload,
  QueueJobCompletedPayload,
  SystemAlertPayload,
  TaskCompletedPayload,
  TaskStatusChangedPayload,
} from '@openthrottle/openthrottle-notifications';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { Injectable } from '@nestjs/common';
import { NestjsWebsocketsGateway } from '@openthrottle/nestjs-websockets';

function isoNow(): string {
  return new Date().toISOString();
}

/** App-relative path prefix for plan click-through (e.g. developer app /plans/:id). */
const PLAN_LINK_PREFIX = '/plans/';

function planLink(planId: string): string {
  return `${PLAN_LINK_PREFIX}${planId}`;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly gateway: NestjsWebsocketsGateway) {}

  /**
   * @description Emits a debug notification used for debugging and for
   * firing off events from the server.
   */
  emitDebug(payload: {
    data: unknown;
    message: string;
    severity?: NotificationSeverity;
  }): void {
    const data: DebugPayload = {
      data: payload.data,
      message: payload.message,
      severity: payload.severity ?? 'info',
      timestamp: isoNow(),
    };

    this.gateway.server.emit(NOTIFICATION_EVENT_NAMES.DEBUG, data);
  }

  /**
   * @description Emits plan.enqueued. Call when a plan is enqueued for processing.
   * Shows the job's position in the queue (e.g., "Your plan is #2 of 5 in queue").
   */
  emitPlanEnqueued(payload: {
    link?: string;
    planId: string;
    queuePosition: number;
    queueTotal: number;
    severity?: NotificationSeverity;
  }): void {
    const message =
      payload.queueTotal === 1
        ? 'Your plan is next in queue'
        : `Your plan is #${payload.queuePosition} of ${payload.queueTotal} in queue`;

    const data: PlanEnqueuedPayload = {
      link: payload.link ?? planLink(payload.planId),
      message,
      planId: payload.planId,
      queuePosition: payload.queuePosition,
      queueTotal: payload.queueTotal,
      severity: payload.severity ?? 'info',
      timestamp: isoNow(),
    };

    this.gateway.server.emit(NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED, data);
  }

  /**
   * @description Emits plan.updated. Call after creating or updating a plan (e.g. from GraphQL).
   * When link is not provided and planId is present, link is set to /plans/:planId for click-through.
   */
  emitPlanUpdated(payload: {
    link?: string;
    message: string;
    planId: string;
    severity?: NotificationSeverity;
    taskId?: string;
  }): void {
    const data: PlanUpdatedPayload = {
      link: payload.link ?? planLink(payload.planId),
      message: payload.message,
      planId: payload.planId,
      severity: payload.severity ?? 'info',
      taskId: payload.taskId,
      timestamp: isoNow(),
    };

    this.gateway.server.emit(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED, data);
  }

  /**
   * @description Emits task.completed. Call when a task is completed or status changes (e.g. from GraphQL).
   * When link is not provided and planId is present, link is set to /plans/:planId for click-through.
   */
  emitTaskCompleted(payload: {
    link?: string;
    message: string;
    planId: string;
    severity?: NotificationSeverity;
    taskId: string;
  }): void {
    const data: TaskCompletedPayload = {
      link: payload.link ?? planLink(payload.planId),
      message: payload.message,
      planId: payload.planId,
      severity: payload.severity ?? 'info',
      taskId: payload.taskId,
      timestamp: isoNow(),
    };

    this.gateway.server.emit(NOTIFICATION_EVENT_NAMES.TASK_COMPLETED, data);
  }

  /**
   * @description Emits queue.job.completed. Call when a queue processor finishes a job (e.g. plans, daily-stats).
   * When link is not provided and planId is present, link is set to /plans/:planId for click-through.
   */
  emitQueueJobCompleted(payload: {
    jobType: string;
    link?: string;
    message: string;
    planId?: string;
    severity?: NotificationSeverity;
    taskId?: string;
  }): void {
    const data: QueueJobCompletedPayload = {
      jobType: payload.jobType,
      link:
        payload.link ??
        (payload.planId != null ? planLink(payload.planId) : undefined),
      message: payload.message,
      planId: payload.planId,
      severity: payload.severity ?? 'info',
      taskId: payload.taskId,
      timestamp: isoNow(),
    };

    this.gateway.server.emit(
      NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED,
      data,
    );
  }

  /**
   * @description Emits plan.waiting_for_worktree when a plan job is delayed because all worktrees
   * are currently locked. The job will automatically retry after the specified delay.
   * When link is not provided, link is set to /plans/:planId for click-through.
   */
  emitPlanWaitingForWorktree(payload: {
    link?: string;
    planId: string;
    retryDelayMs: number;
    severity?: NotificationSeverity;
  }): void {
    const delaySec = Math.round(payload.retryDelayMs / 1000);
    const message = `Plan is waiting for a worktree (all busy). Retrying in ${delaySec}s...`;

    const data: PlanWaitingForWorktreePayload = {
      link: payload.link ?? planLink(payload.planId),
      message,
      planId: payload.planId,
      retryDelayMs: payload.retryDelayMs,
      severity: payload.severity ?? 'info',
      timestamp: isoNow(),
    };

    this.gateway.server.emit(
      NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE,
      data,
    );
  }

  /**
   * @description Emits plan.status_changed so the developer app can revalidate plan detail without manual refresh.
   */
  emitPlanStatusChanged(payload: { planId: string; status: string }): void {
    const data: PlanStatusChangedPayload = {
      planId: payload.planId,
      status: payload.status,
      timestamp: isoNow(),
    };

    this.gateway.server.emit(
      NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      data,
    );
  }

  /**
   * @description Emits system.alert for system-wide alerts (e.g. maintenance, errors).
   */
  emitSystemAlert(payload: {
    code?: string;
    message: string;
    severity?: NotificationSeverity;
  }): void {
    const data: SystemAlertPayload = {
      code: payload.code,
      message: payload.message,
      severity: payload.severity ?? 'info',
      timestamp: isoNow(),
    };

    this.gateway.server.emit(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, data);
  }

  /**
   * @description Emits task.status_changed so the developer app can revalidate plan/tasks without manual refresh.
   */
  emitTaskStatusChanged(payload: {
    planId: string;
    status: string;
    taskId: string;
  }): void {
    const data: TaskStatusChangedPayload = {
      planId: payload.planId,
      status: payload.status,
      taskId: payload.taskId,
      timestamp: isoNow(),
    };

    this.gateway.server.emit(
      NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
      data,
    );
  }
}
