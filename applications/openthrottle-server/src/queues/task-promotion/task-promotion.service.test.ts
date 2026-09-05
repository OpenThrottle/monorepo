/**
 * @description Unit tests for {@link TaskPromotionService.promote}: the full
 * six-step promotion (plan from task, tag copy with ≤1 phase tag, seed task,
 * source close-out, work-ledger provenance, status notification), the
 * idempotent no-op on redelivery of an already-promoted task, and the
 * task-missing guard. The transaction is exercised by invoking the callback
 * against mocked per-entity repositories.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkArtifact } from '@openthrottle/nestjs-repositories';
import {
  Plan,
  PlanTag,
  type PlansService,
  Task,
  TaskTag,
  WorkSession,
  WorkSessionSubject,
  plansFactory,
  tasksFactory,
  workSessionsFactory,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import type { EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationsService } from '../../notifications/notifications.service';
import { PROMOTED_TAG, PROMOTED_TASK_STATUS } from './task-promotion.constants';
import { TaskPromotionService } from './task-promotion.service';

const TASK_ID = '00000000-0000-4000-8000-000000000001';
const SOURCE_PLAN_ID = '00000000-0000-4000-8000-0000000000a1';
const NEW_PLAN_ID = '00000000-0000-4000-8000-0000000000b2';

describe('TaskPromotionService.promote', () => {
  let taskRepo: Repository<Task>;
  let planRepo: Repository<Plan>;
  let planTagRepo: Repository<PlanTag>;
  let taskTagRepo: Repository<TaskTag>;
  let sessionRepo: Repository<WorkSession>;
  let subjectRepo: Repository<WorkSessionSubject>;
  let artifactRepo: Repository<WorkArtifact>;
  let manager: EntityManager;
  let notifications: NotificationsService;
  let plansService: PlansService;
  let service: TaskPromotionService;
  let getOne: ReturnType<typeof vi.fn>;

  const buildTask = (overrides: Partial<Task> = {}): Task =>
    tasksFactory.build({
      assignee: 'visormatt',
      category: 'feature',
      description: 'The body of the task.',
      id: TASK_ID,
      planId: SOURCE_PLAN_ID,
      status: 'PENDING',
      summary: null,
      title: 'Do the important thing',
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();

    taskRepo = createMock<Repository<Task>>();
    planRepo = createMock<Repository<Plan>>();
    planTagRepo = createMock<Repository<PlanTag>>();
    taskTagRepo = createMock<Repository<TaskTag>>();
    sessionRepo = createMock<Repository<WorkSession>>();
    subjectRepo = createMock<Repository<WorkSessionSubject>>();
    artifactRepo = createMock<Repository<WorkArtifact>>();

    getOne = vi.fn().mockResolvedValue(buildTask());
    vi.mocked(taskRepo.createQueryBuilder).mockReturnValue(
      asMock({
        getOne,
        setLock: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      }),
    );
    vi.mocked(taskRepo.create).mockImplementation((dto) => asMock<Task>(dto));

    // create() echoes its arg; save() resolves persisted rows.
    vi.mocked(planRepo.create).mockImplementation((dto) => asMock<Plan>(dto));
    vi.mocked(planRepo.save).mockResolvedValue(
      plansFactory.build({ id: NEW_PLAN_ID }),
    );
    vi.mocked(planRepo.findOne).mockResolvedValue(
      plansFactory.build({
        author: 'visormatt',
        category: 'feature',
        id: SOURCE_PLAN_ID,
      }),
    );
    vi.mocked(planTagRepo.create).mockImplementation((dto) =>
      asMock<PlanTag>(dto),
    );
    vi.mocked(planTagRepo.save).mockResolvedValue(asMock<PlanTag>({}));
    vi.mocked(taskTagRepo.find).mockResolvedValue([]);
    vi.mocked(taskTagRepo.findOne).mockResolvedValue(null);
    vi.mocked(taskTagRepo.create).mockImplementation((dto) =>
      asMock<TaskTag>(dto),
    );
    vi.mocked(sessionRepo.create).mockImplementation((dto) =>
      asMock<WorkSession>(dto),
    );
    vi.mocked(sessionRepo.save).mockResolvedValue(
      workSessionsFactory.build({ id: 'session-1' }),
    );
    vi.mocked(subjectRepo.create).mockImplementation((dto) =>
      asMock<WorkSessionSubject>(dto),
    );
    vi.mocked(artifactRepo.create).mockImplementation((dto) =>
      asMock<WorkArtifact>(dto),
    );

    manager = createMock<EntityManager>({
      getRepository: vi.fn((target: unknown) => {
        if (target === Task) return taskRepo;
        if (target === Plan) return planRepo;
        if (target === PlanTag) return planTagRepo;
        if (target === TaskTag) return taskTagRepo;
        if (target === WorkSession) return sessionRepo;
        if (target === WorkSessionSubject) return subjectRepo;
        return artifactRepo;
      }),
    });

    const serviceRepo = asMock<Repository<Plan>>({
      manager: asMock<EntityManager>({
        transaction: vi.fn((cb: (m: EntityManager) => Promise<unknown>) =>
          cb(manager),
        ),
      }),
    });
    plansService = createMock<PlansService>({
      getRepository: vi.fn(() => serviceRepo),
    });
    notifications = createMock<NotificationsService>();

    service = new TaskPromotionService(
      createMock<LoggerService>(),
      notifications,
      plansService,
    );
  });

  it('creates a plan, seeds a task, closes out the source, and records provenance', async () => {
    const result = await service.promote({
      actorServiceAccountId: null,
      actorUserId: 'user-1',
      taskId: TASK_ID,
    });

    expect(result).toEqual({ newPlanId: NEW_PLAN_ID, skipped: null });

    // Step 1: new plan carries the source title + a provenance preamble.
    expect(planRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        author: 'visormatt',
        status: 'PENDING',
        title: 'Do the important thing',
      }),
    );
    const planDto = vi.mocked(planRepo.create).mock.calls[0][0];
    expect(planDto.description).toContain(`Promoted from task ${TASK_ID}`);

    // Step 3: one seeded task on the new plan.
    expect(taskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: NEW_PLAN_ID,
        title: 'Break down and scope this plan',
      }),
    );

    // Step 4: source task → SKIPPED with a note, plus the `promoted` tag.
    expect(taskRepo.update).toHaveBeenCalledWith(
      { id: TASK_ID },
      expect.objectContaining({
        status: PROMOTED_TASK_STATUS,
        summary: expect.stringContaining(NEW_PLAN_ID),
      }),
    );
    expect(taskTagRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ tag: PROMOTED_TAG, taskId: TASK_ID }),
    );

    // Step 5: born-verified plan_promotion artifact under a 2-subject session,
    // attributed to the requesting user (exactly one actor column set).
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorServiceAccountId: null,
        actorUserId: 'user-1',
      }),
    );
    expect(subjectRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ planId: SOURCE_PLAN_ID, taskId: TASK_ID }),
      expect.objectContaining({ planId: NEW_PLAN_ID, taskId: null }),
    ]);
    expect(artifactRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'server',
        type: 'plan_promotion',
        verification: 'verified',
      }),
    );

    // Step 6: status notification emitted after commit.
    expect(notifications.emitTaskStatusChanged).toHaveBeenCalledWith({
      planId: SOURCE_PLAN_ID,
      status: PROMOTED_TASK_STATUS,
      taskId: TASK_ID,
    });
  });

  it('attributes the provenance session to a service account when the promoter is one', async () => {
    await service.promote({
      actorServiceAccountId: 'svc-1',
      actorUserId: null,
      taskId: TASK_ID,
    });

    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorServiceAccountId: 'svc-1',
        actorUserId: null,
      }),
    );
  });

  it('skips work-ledger provenance (no invalid session) when no actor resolves', async () => {
    const result = await service.promote({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    // Promotion still succeeds; the one-actor work_sessions row is simply not written.
    expect(result).toEqual({ newPlanId: NEW_PLAN_ID, skipped: null });
    expect(sessionRepo.create).not.toHaveBeenCalled();
    expect(artifactRepo.create).not.toHaveBeenCalled();
  });

  it('copies task tags to the plan, keeping at most one phase tag', async () => {
    vi.mocked(taskTagRepo.find).mockResolvedValue([
      asMock<TaskTag>({ dimension: 'phase', source: 'human', tag: 'design' }),
      asMock<TaskTag>({
        dimension: 'phase',
        source: 'agent',
        tag: 'breakdown',
      }),
      asMock<TaskTag>({ dimension: 'domain', source: 'human', tag: 'server' }),
    ]);

    await service.promote({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    // Each copied row goes through planTagRepo.create; inspect those dtos.
    const createdRows = vi
      .mocked(planTagRepo.create)
      .mock.calls.map((call) => call[0]);
    expect(createdRows).toHaveLength(2);
    expect(
      createdRows.filter((row) => row?.dimension === 'phase'),
    ).toHaveLength(1);
    expect(createdRows.map((row) => row?.tag)).toContain('server');
  });

  it('is a no-op when the source task is already promoted (SKIPPED + promoted tag)', async () => {
    getOne.mockResolvedValue(buildTask({ status: 'SKIPPED' }));
    vi.mocked(taskTagRepo.findOne).mockResolvedValue(
      asMock<TaskTag>({ tag: PROMOTED_TAG, taskId: TASK_ID }),
    );

    const result = await service.promote({
      actorServiceAccountId: null,
      actorUserId: 'user-1',
      taskId: TASK_ID,
    });

    expect(result).toEqual({ newPlanId: null, skipped: 'already-promoted' });
    expect(planRepo.save).not.toHaveBeenCalled();
    expect(notifications.emitTaskStatusChanged).not.toHaveBeenCalled();
  });

  it('is a no-op when the source task no longer exists', async () => {
    getOne.mockResolvedValue(null);

    const result = await service.promote({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    expect(result).toEqual({ newPlanId: null, skipped: 'task-missing' });
    expect(planRepo.save).not.toHaveBeenCalled();
    expect(notifications.emitTaskStatusChanged).not.toHaveBeenCalled();
  });
});
