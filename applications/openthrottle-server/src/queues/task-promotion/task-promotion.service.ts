/**
 * @description Domain logic for promoting a task into a full plan (plan c109e700).
 *
 * A promotion is a first-class capability, not a row move. In one transaction it:
 *   1. creates a new plan from the source task (title/description + a provenance
 *      preamble, author/assignee/category/project carried from task→source plan);
 *   2. copies the source task's tags onto the new plan (at most one phase tag,
 *      matching the service-enforced plan invariant);
 *   3. seeds one runnable task ("Break down and scope this plan");
 *   4. closes out the source task: status → SKIPPED, a summary note pointing at the
 *      new plan, and a `promoted` tag;
 *   5. records a born-verified `plan_promotion` work-ledger artifact under a session
 *      whose subjects are the source (plan, task) and the new plan, so the provenance
 *      surfaces on both sides.
 * After the transaction commits it emits a `task.status_changed` notification for the
 * source task so subscriptions update (enqueue/emit-after-commit, like plan-enqueue).
 *
 * Idempotent on at-least-once redelivery: the source task is loaded FOR UPDATE and a
 * task already SKIPPED with the `promoted` tag short-circuits to a no-op. Tag writes go
 * through the transactional EntityManager directly (TagsService is not transaction-aware),
 * carrying each row's dimension/source so provenance is preserved without re-validating
 * against a vocabulary the copied tags already passed.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  Plan,
  PlanTag,
  PlansService,
  Task,
  TASK_SORT_ORDER_GAP,
  TaskTag,
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
  WORK_SESSION_CLOSED_BY,
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import type { EntityManager } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { resolveArtifactForWrite } from '../../graphql/work-ledger/artifact-type-registry';
import {
  PROMOTED_TASK_STATUS,
  PROMOTED_TAG,
  PROMOTION_SESSION_TOOL_NAME,
  SEED_TASK_TITLE,
} from './task-promotion.constants';

const PHASE_DIMENSION = 'phase';

/** Terminal statuses whose `promoted`-tagged tasks are treated as already promoted. */
const ALREADY_PROMOTED_STATUS = PROMOTED_TASK_STATUS;

export interface PromoteTaskParams {
  /** Service-account id of the promoter, when the principal is a machine. */
  readonly actorServiceAccountId: string | null;
  /** User id of the promoter, when the principal is a human. */
  readonly actorUserId: string | null;
  readonly taskId: string;
}

export interface PromoteTaskOutcome {
  /** The plan the task was promoted into, when promotion ran. */
  readonly newPlanId: string | null;
  /** Non-null when the job did nothing (task-missing | already-promoted). */
  readonly skipped: string | null;
}

@Injectable()
export class TaskPromotionService {
  constructor(
    private readonly logger: LoggerService,
    private readonly notificationsService: NotificationsService,
    private readonly plansService: PlansService,
  ) {}

  /**
   * @description Promote a task into a new plan. Steps 1–5 commit together; the
   * status notification is emitted after commit. Returns the new plan id, or a
   * `skipped` reason when the task is missing or already promoted (idempotent).
   */
  async promote(params: PromoteTaskParams): Promise<PromoteTaskOutcome> {
    const { actorServiceAccountId, actorUserId, taskId } = params;
    const repo = this.plansService.getRepository();

    const outcome = await repo.manager.transaction(async (manager) => {
      const task = await manager
        .getRepository(Task)
        .createQueryBuilder('task')
        .setLock('pessimistic_write')
        .where('task.id = :taskId', { taskId })
        .getOne();

      if (task == null) {
        return { newPlanId: null, skipped: 'task-missing', sourcePlanId: null };
      }

      const alreadyPromoted = await this.isAlreadyPromoted(manager, task);
      if (alreadyPromoted) {
        return {
          newPlanId: null,
          skipped: 'already-promoted',
          sourcePlanId: task.planId,
        };
      }

      const sourcePlan = await manager
        .getRepository(Plan)
        .findOne({ where: { id: task.planId } });

      const newPlan = await this.createPlanFromTask(manager, task, sourcePlan);
      await this.copyTaskTagsToPlan(manager, task.id, newPlan.id);
      await this.seedInitialTask(manager, newPlan.id, task);
      await this.closeOutSourceTask(manager, task, newPlan.id);
      await this.recordPromotionProvenance(manager, {
        actorServiceAccountId,
        actorUserId,
        newPlanId: newPlan.id,
        sourcePlanId: task.planId,
        sourceTaskId: task.id,
      });

      return {
        newPlanId: newPlan.id,
        skipped: null,
        sourcePlanId: task.planId,
      };
    });

    if (outcome.newPlanId != null && outcome.sourcePlanId != null) {
      // Emit-after-commit: the source task is durably SKIPPED before subscribers hear it.
      this.notificationsService.emitTaskStatusChanged({
        planId: outcome.sourcePlanId,
        status: PROMOTED_TASK_STATUS,
        taskId,
      });
      this.logger.info(
        `Promoted task ${taskId} into plan ${outcome.newPlanId}`,
        TaskPromotionService.name,
      );
    }

    return { newPlanId: outcome.newPlanId, skipped: outcome.skipped };
  }

  /** True when the source task is already in a terminal promoted state (no-op guard). */
  private async isAlreadyPromoted(
    manager: EntityManager,
    task: Task,
  ): Promise<boolean> {
    if (task.status !== ALREADY_PROMOTED_STATUS) {
      return false;
    }
    const existing = await manager
      .getRepository(TaskTag)
      .findOne({ where: { tag: PROMOTED_TAG, taskId: task.id } });
    return existing != null;
  }

  /** Step 1: new plan from the source task with a provenance preamble. */
  private async createPlanFromTask(
    manager: EntityManager,
    task: Task,
    sourcePlan: Plan | null,
  ): Promise<Plan> {
    const preamble = `> Promoted from task ${task.id} in plan ${task.planId}.`;
    const body = task.description?.trim() ?? '';
    const description = body === '' ? preamble : `${preamble}\n\n${body}`;

    const planRepo = manager.getRepository(Plan);
    const plan = planRepo.create({
      assignee: task.assignee ?? sourcePlan?.assignee ?? null,
      author: task.assignee ?? sourcePlan?.author ?? 'openthrottle',
      category: task.category ?? sourcePlan?.category ?? 'feature',
      description,
      project: task.project ?? sourcePlan?.project ?? null,
      projectId: task.projectId ?? sourcePlan?.projectId ?? null,
      status: 'PENDING',
      title: task.title,
    });
    return planRepo.save(plan);
  }

  /**
   * Step 2: copy the source task's tags onto the new plan, preserving each row's
   * dimension/source/confidence. Keeps at most one phase tag to match the plan
   * invariant (task_tags don't enforce it; plan tags do, service-side).
   */
  private async copyTaskTagsToPlan(
    manager: EntityManager,
    taskId: string,
    planId: string,
  ): Promise<void> {
    const taskTags = await manager
      .getRepository(TaskTag)
      .find({ where: { taskId } });
    if (taskTags.length === 0) {
      return;
    }

    let phaseTagCopied = false;
    const planTagRepo = manager.getRepository(PlanTag);
    const rows = taskTags.flatMap((tag) => {
      if (tag.dimension === PHASE_DIMENSION) {
        if (phaseTagCopied) return [];
        phaseTagCopied = true;
      }
      return [
        planTagRepo.create({
          confidence: tag.confidence,
          dimension: tag.dimension,
          planId,
          source: tag.source,
          tag: tag.tag,
        }),
      ];
    });

    await planTagRepo.save(rows);
  }

  /** Step 3: seed one runnable task so the promoted plan can be worked immediately. */
  private async seedInitialTask(
    manager: EntityManager,
    planId: string,
    task: Task,
  ): Promise<void> {
    const taskRepo = manager.getRepository(Task);
    await taskRepo.save(
      taskRepo.create({
        category: task.category ?? 'feature',
        description:
          'This plan was promoted from a task. Break the brief above into concrete, scoped tasks before running it.',
        planId,
        sortOrder: TASK_SORT_ORDER_GAP,
        status: 'PENDING',
        title: SEED_TASK_TITLE,
      }),
    );
  }

  /** Step 4: close out the source task (SKIPPED + summary note + `promoted` tag). */
  private async closeOutSourceTask(
    manager: EntityManager,
    task: Task,
    newPlanId: string,
  ): Promise<void> {
    const note = `Promoted into plan ${newPlanId}.`;
    const summary =
      task.summary == null || task.summary.trim() === ''
        ? note
        : `${task.summary}\n\n${note}`;

    await manager
      .getRepository(Task)
      .update({ id: task.id }, { status: PROMOTED_TASK_STATUS, summary });

    const tagRepo = manager.getRepository(TaskTag);
    const existing = await tagRepo.findOne({
      where: { tag: PROMOTED_TAG, taskId: task.id },
    });
    if (existing == null) {
      await tagRepo.save(
        tagRepo.create({
          confidence: null,
          dimension: 'domain',
          source: 'agent',
          tag: PROMOTED_TAG,
          taskId: task.id,
        }),
      );
    }
  }

  /**
   * Step 5: a born-verified `plan_promotion` artifact under a session whose subjects
   * are the source (plan, task) and the new plan, so the link surfaces on both sides.
   */
  private async recordPromotionProvenance(
    manager: EntityManager,
    params: {
      actorServiceAccountId: string | null;
      actorUserId: string | null;
      newPlanId: string;
      sourcePlanId: string;
      sourceTaskId: string;
    },
  ): Promise<void> {
    // work_sessions requires exactly one actor (chk_work_sessions_one_actor). When
    // neither a user nor a service account resolves (a degenerate system path), skip
    // the provenance artifact rather than fail the whole promotion transaction.
    if (params.actorUserId == null && params.actorServiceAccountId == null) {
      this.logger.warn(
        `Skipping work-ledger provenance for task ${params.sourceTaskId}: no actor to attribute the session to`,
        TaskPromotionService.name,
      );
      return;
    }

    const now = new Date();
    const session = await manager.getRepository(WorkSession).save(
      manager.getRepository(WorkSession).create({
        actorServiceAccountId: params.actorServiceAccountId,
        actorUserId: params.actorUserId,
        closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
        endedAt: now,
        onBehalfOfVerified: false,
        startedAt: now,
        toolName: PROMOTION_SESSION_TOOL_NAME,
      }),
    );

    const subjectRepo = manager.getRepository(WorkSessionSubject);
    await subjectRepo.save([
      subjectRepo.create({
        planId: params.sourcePlanId,
        sessionId: session.id,
        taskId: params.sourceTaskId,
      }),
      subjectRepo.create({
        planId: params.newPlanId,
        sessionId: session.id,
        taskId: null,
      }),
    ]);

    const resolved = resolveArtifactForWrite('plan_promotion', {
      newPlanId: params.newPlanId,
      sourcePlanId: params.sourcePlanId,
      sourceTaskId: params.sourceTaskId,
    });
    const artifactRepo = manager.getRepository(WorkArtifact);
    await artifactRepo.save(
      artifactRepo.create({
        externalKey: resolved.externalKey,
        lifecycle: resolved.initialLifecycle,
        message: `Promoted task ${params.sourceTaskId} into plan ${params.newPlanId}`,
        payload: resolved.payload,
        producedAt: now,
        sessionId: session.id,
        // First-party, server-witnessed promotion: born verified, not a claim.
        source: WORK_ARTIFACT_SOURCE.SERVER,
        type: 'plan_promotion',
        verification: WORK_ARTIFACT_VERIFICATION.VERIFIED,
        verifiedAt: now,
      }),
    );
  }
}
