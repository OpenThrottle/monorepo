/**
 * @description Central service to emit notification events. Real-time delivery is
 * over GraphQL subscriptions (graphql-ws) via the injectable PubSub — the Socket.IO
 * path has been retired. Event names/severity still come from
 * @openthrottle/openthrottle-notifications (the discriminators); the payload shapes
 * are the code-first NotificationEvent types in the schema.
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
import { Inject, Injectable } from '@nestjs/common';
import {
  PUB_SUB,
  notificationsFirehoseTopic,
  planLifecycleTopic,
  systemAlertTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';

function isoNow(): string {
  return new Date().toISOString();
}

/** App-relative path prefix for plan click-through (e.g. developer app /plans/:id). */
const PLAN_LINK_PREFIX = '/plans/';

function planLink(planId: string): string {
  return `${PLAN_LINK_PREFIX}${planId}`;
}

function safeJson(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

/** A notification event object carrying its discriminator for interface resolution. */
type NotificationEventObject = Record<string, unknown> & { event: string };

@Injectable()
export class NotificationsService {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSubEngine) {}

  /**
   * @description Fan an event out to its PubSub topics. The firehose topic always
   * gets it; resource/global topics are added per event so subscribers route by
   * topic instead of filtering client-side. Fire-and-forget: a publish failure must
   * not break the originating mutation.
   */
  private fanout(event: NotificationEventObject, topics: string[]): void {
    const all = [notificationsFirehoseTopic(), ...topics];

    void Promise.all(
      all.map((topic) => this.pubSub.publish(topic, { event })),
    ).catch(() => undefined);
  }

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

    this.fanout(
      {
        dataJson: safeJson(payload.data),
        event: NOTIFICATION_EVENT_NAMES.DEBUG,
        message: data.message,
        severity: data.severity,
        timestamp: data.timestamp,
      },
      [],
    );
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

    this.fanout({ ...data, event: NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED }, [
      planLifecycleTopic(payload.planId),
    ]);
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

    this.fanout({ ...data, event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED }, [
      planLifecycleTopic(payload.planId),
    ]);
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

    this.fanout({ ...data, event: NOTIFICATION_EVENT_NAMES.TASK_COMPLETED }, [
      planLifecycleTopic(payload.planId),
    ]);
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

    this.fanout(
      { ...data, event: NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED },
      payload.planId != null ? [planLifecycleTopic(payload.planId)] : [],
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

    this.fanout(
      { ...data, event: NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE },
      [planLifecycleTopic(payload.planId)],
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

    this.fanout(
      { ...data, event: NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED },
      [planLifecycleTopic(payload.planId)],
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

    this.fanout({ ...data, event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT }, [
      systemAlertTopic(),
    ]);
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

    this.fanout(
      { ...data, event: NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED },
      [planLifecycleTopic(payload.planId)],
    );
  }
}
