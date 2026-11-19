import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Task } from '../tasks/task.entity.ts';
import { RuleApplication } from './rule-application.entity.ts';
import {
  RULE_APPLICATION_STATES,
  SOFT_CLOSED_TASK_STATUS,
} from './rule-applications.constants.ts';
import { ruleApplicationsFactory } from './rule-applications.factory.ts';
import { RuleApplicationsRepository } from './rule-applications.repository.ts';
import type { OrphanedTaskStatusCaptureParams } from './rule-applications.types.ts';

const PLAN_ID = 'plan-1';

const appliedRow = (
  id: string,
  ruleId: string,
  taskId: string | null,
): RuleApplication => {
  return createMock<RuleApplication>({
    id,
    planId: PLAN_ID,
    ruleId,
    state: RULE_APPLICATION_STATES.APPLIED,
    taskId,
  });
};

describe('RuleApplicationsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const create = vi.fn();
  const save = vi.fn();
  const getRawMany = vi.fn();
  const getMany = vi.fn();

  const edgeQueryBuilder = {
    addOrderBy: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany,
    getRawMany,
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  // Select-lock-update: getMany() drives which rows are "affected" (and each row's own
  // status, for the capture's `fromStatus`); the update-builder's execute() is the by-id update.
  const taskSelectGetMany = vi.fn().mockResolvedValue([]);
  const taskSelectQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    getMany: taskSelectGetMany,
    setLock: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const taskRepoForManager = {
    createQueryBuilder: vi.fn(() => taskSelectQueryBuilder),
  };
  const taskUpdateExecute = vi.fn().mockResolvedValue({ affected: 1 });
  const taskUpdateBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute: taskUpdateExecute,
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const managerUpdate = vi.fn().mockResolvedValue(undefined);
  const managerCreateQueryBuilder = vi.fn(() => taskUpdateBuilder);
  const managerGetRepository = vi.fn(() => taskRepoForManager);
  const transaction = vi.fn(
    async (
      cb: (manager: {
        createQueryBuilder: typeof managerCreateQueryBuilder;
        getRepository: typeof managerGetRepository;
        update: typeof managerUpdate;
      }) => unknown,
    ) => {
      return cb({
        createQueryBuilder: managerCreateQueryBuilder,
        getRepository: managerGetRepository,
        update: managerUpdate,
      });
    },
  );

  const typeormRepository = {
    create,
    createQueryBuilder: vi.fn(() => edgeQueryBuilder),
    find,
    findOne,
    manager: { transaction },
    save,
    target: RuleApplication,
  };

  let repository: RuleApplicationsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    create.mockImplementation((input: object) => {
      return input;
    });
    save.mockImplementation(async (entity: object) => {
      return entity;
    });
    getRawMany.mockResolvedValue([]);
    getMany.mockResolvedValue([]);
    taskUpdateExecute.mockResolvedValue({ affected: 1 });
    managerCreateQueryBuilder.mockReturnValue(taskUpdateBuilder);
    taskSelectGetMany.mockReset().mockResolvedValue([]);
    managerGetRepository.mockReturnValue(taskRepoForManager);

    const app = await Test.createTestingModule({
      providers: [
        RuleApplicationsRepository,
        {
          provide: getRepositoryToken(RuleApplication),
          useValue: typeormRepository,
        },
      ],
    }).compile();

    repository = app.get(RuleApplicationsRepository);
  });

  describe('listForPlan', () => {
    it('lists the ledger rows of live rules oldest first', async () => {
      const rows = ruleApplicationsFactory.buildList(2, { planId: PLAN_ID });
      getMany.mockResolvedValue(rows);

      await expect(repository.listForPlan(PLAN_ID)).resolves.toEqual(rows);
      // An INNER JOIN on the live rule: a nested `rule: { deletedAt: IsNull() }` where is a
      // no-op, because TypeORM LEFT JOINs it with the soft-delete guard in the ON clause.
      expect(edgeQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'application.rule',
        'rule',
      );
      expect(edgeQueryBuilder.where).toHaveBeenCalledWith(
        'application.planId = :planId',
        { planId: PLAN_ID },
      );
      expect(edgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rule.deletedAt IS NULL',
      );
      expect(edgeQueryBuilder.orderBy).toHaveBeenCalledWith(
        'application.createdAt',
        'ASC',
      );
    });
  });

  describe('findByRuleAndPlan', () => {
    it('returns the ledger row in any state', async () => {
      const row = ruleApplicationsFactory.build({ planId: PLAN_ID });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByRuleAndPlan(row.ruleId, PLAN_ID),
      ).resolves.toBe(row);
    });

    it('returns null when the rule never applied to the plan', async () => {
      await expect(
        repository.findByRuleAndPlan('rule-1', PLAN_ID),
      ).resolves.toBeNull();
    });
  });

  describe('record', () => {
    it('inserts the ledger row', async () => {
      await repository.record({
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: RULE_APPLICATION_STATES.APPLIED,
        taskId: 'task-1',
      });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          details: null,
          planId: PLAN_ID,
          ruleId: 'rule-1',
          state: 'applied',
          taskId: 'task-1',
        }),
        undefined,
      );
    });

    it('returns the winning row on a unique-violation race', async () => {
      const winner = ruleApplicationsFactory.build({ planId: PLAN_ID });
      save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate'), { code: '23505' }),
        ),
      );
      findOne.mockResolvedValue(winner);

      await expect(
        repository.record({
          planId: PLAN_ID,
          ruleId: winner.ruleId,
          state: RULE_APPLICATION_STATES.APPLIED,
        }),
      ).resolves.toBe(winner);
    });

    it('rethrows any other failure', async () => {
      save.mockRejectedValue(new Error('boom'));

      await expect(
        repository.record({
          planId: PLAN_ID,
          ruleId: 'rule-1',
          state: RULE_APPLICATION_STATES.APPLIED,
        }),
      ).rejects.toThrow('boom');
    });
  });

  describe('upsertApplication', () => {
    it('inserts when the (rule, plan) row does not exist', async () => {
      await repository.upsertApplication({
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: RULE_APPLICATION_STATES.APPLIED,
        taskId: 'task-1',
      });

      const [entity] = save.mock.calls[0] ?? [];
      expect(entity).toEqual({
        details: null,
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'applied',
        taskId: 'task-1',
      });
    });

    it('overwrites the existing row by id', async () => {
      findOne.mockResolvedValue(
        ruleApplicationsFactory.build({ id: 'existing', planId: PLAN_ID }),
      );

      await repository.upsertApplication({
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: RULE_APPLICATION_STATES.APPLIED,
        taskId: 'task-2',
      });

      const [entity] = save.mock.calls[0] ?? [];
      expect(entity).toEqual(
        expect.objectContaining({ id: 'existing', taskId: 'task-2' }),
      );
    });
  });

  describe('listEdgePlacementSiblings', () => {
    it('reads applied rows of live inject-task rules and defaults to first', async () => {
      getRawMany.mockResolvedValue([{ sortOrder: '2000', taskId: 'task-1' }]);

      await expect(
        repository.listEdgePlacementSiblings(PLAN_ID, 'first', ['COMPLETED']),
      ).resolves.toEqual([{ sortOrder: 2000, taskId: 'task-1' }]);
      expect(edgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rule.deletedAt IS NULL',
      );
      expect(edgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(rule.action_payload->>'placement' = 'first' OR rule.action_payload->>'placement' IS NULL)",
      );
    });

    it('filters on the named placement for last', async () => {
      await repository.listEdgePlacementSiblings(PLAN_ID, 'last', []);

      expect(edgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        "rule.action_payload->>'placement' = :placement",
        { placement: 'last' },
      );
    });
  });

  describe('orphanUnmatchedApplications', () => {
    it('orphans unmatched applied rows and soft-closes their injected tasks', async () => {
      getMany.mockResolvedValue([
        appliedRow('app-1', 'rule-unmatched', 'task-1'),
      ]);
      taskSelectGetMany.mockResolvedValue([
        { id: 'task-1', status: 'PENDING' },
      ]);

      const count = await repository.orphanUnmatchedApplications(PLAN_ID, [
        'rule-still-matched',
      ]);

      expect(count).toBe(1);
      expect(managerUpdate).toHaveBeenCalledWith(
        RuleApplication,
        { id: expect.anything() },
        { state: RULE_APPLICATION_STATES.ORPHANED },
      );
      expect(taskSelectQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(taskSelectQueryBuilder.where).toHaveBeenCalledWith(
        'task.id IN (:...ids)',
        { ids: ['task-1'] },
      );
      expect(taskSelectQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status IN (:...nonTerminal)',
        { nonTerminal: ['BACKLOG', 'BLOCKED', 'IN_PROGRESS', 'PENDING'] },
      );
      expect(taskUpdateBuilder.update).toHaveBeenCalledWith(Task);
      // The orphan soft-close is reversible and is NOT a promotion: it must stay SKIPPED,
      // never PROMOTED (inject-task.executor revives a task by recognizing exactly this value).
      expect(SOFT_CLOSED_TASK_STATUS).toBe('SKIPPED');
      expect(taskUpdateBuilder.set).toHaveBeenCalledWith({ status: 'SKIPPED' });
      expect(taskUpdateBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', {
        ids: ['task-1'],
      });
    });

    it('does not touch tasks for an orphaned row with no injected task', async () => {
      getMany.mockResolvedValue([appliedRow('app-2', 'rule-unmatched', null)]);

      const count = await repository.orphanUnmatchedApplications(PLAN_ID, []);

      expect(count).toBe(1);
      expect(managerUpdate).toHaveBeenCalledTimes(1);
      expect(managerGetRepository).not.toHaveBeenCalled();
      expect(managerCreateQueryBuilder).not.toHaveBeenCalled();
    });

    it('reads only the applied rows of live rules', async () => {
      await repository.orphanUnmatchedApplications(PLAN_ID, []);

      expect(edgeQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'application.rule',
        'rule',
      );
      expect(edgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'application.state = :applied',
        { applied: RULE_APPLICATION_STATES.APPLIED },
      );
      expect(edgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rule.deletedAt IS NULL',
      );
    });

    it('is a no-op when every applied row still matches', async () => {
      getMany.mockResolvedValue([appliedRow('app-3', 'rule-a', 'task-3')]);

      const count = await repository.orphanUnmatchedApplications(PLAN_ID, [
        'rule-a',
      ]);

      expect(count).toBe(0);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('skips the task update entirely when every candidate task is already terminal', async () => {
      getMany.mockResolvedValue([
        appliedRow('app-4', 'rule-unmatched', 'task-4'),
      ]);
      taskSelectGetMany.mockResolvedValue([]);

      const count = await repository.orphanUnmatchedApplications(PLAN_ID, []);

      expect(count).toBe(1);
      expect(managerCreateQueryBuilder).not.toHaveBeenCalled();
    });

    it('invokes the supplied capture once per soft-closed task, with its own prior status', async () => {
      getMany.mockResolvedValue([
        appliedRow('app-1', 'rule-unmatched', 'task-1'),
        appliedRow('app-2', 'rule-unmatched-2', 'task-2'),
      ]);
      taskSelectGetMany.mockResolvedValue([
        { id: 'task-1', status: 'PENDING' },
        { id: 'task-2', status: 'IN_PROGRESS' },
      ]);
      const capture = vi
        .fn<(params: OrphanedTaskStatusCaptureParams) => Promise<void>>()
        .mockResolvedValue(undefined);

      await repository.orphanUnmatchedApplications(
        PLAN_ID,
        ['rule-still-matched'],
        capture,
      );

      expect(capture).toHaveBeenCalledTimes(2);
      expect(capture).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: 'PENDING',
          planId: PLAN_ID,
          taskId: 'task-1',
        }),
      );
      expect(capture).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: 'IN_PROGRESS',
          planId: PLAN_ID,
          taskId: 'task-2',
        }),
      );
    });

    it('never invokes the supplied capture for a task the terminal-status guard excluded', async () => {
      getMany.mockResolvedValue([
        appliedRow('app-1', 'rule-unmatched', 'task-1'),
      ]);
      taskSelectGetMany.mockResolvedValue([]);
      const capture = vi
        .fn<(params: OrphanedTaskStatusCaptureParams) => Promise<void>>()
        .mockResolvedValue(undefined);

      await repository.orphanUnmatchedApplications(PLAN_ID, [], capture);

      expect(capture).not.toHaveBeenCalled();
    });
  });
});
