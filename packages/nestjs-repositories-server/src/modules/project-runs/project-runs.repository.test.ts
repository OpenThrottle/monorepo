import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectRun } from './project-run.entity.ts';
import { PROJECT_RUN_STATUS } from './project-runs.constants.ts';
import { projectRunsFactory } from './project-runs.factory.ts';
import { ProjectRunsRepository } from './project-runs.repository.ts';

const runId = '11111111-1111-4111-8111-111111111111';
const planId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';

/**
 * @description A chainable query-builder stub covering both the select (`distinctOn`) and the
 * update (`set`) builders: every chain method returns the stub, `execute` reports one row.
 */
interface QueryChainStub {
  readonly addOrderBy: Mock;
  readonly andWhere: Mock;
  readonly distinctOn: Mock;
  readonly execute: Mock;
  readonly getMany: Mock;
  readonly orderBy: Mock;
  readonly set: Mock;
  readonly update: Mock;
  readonly where: Mock;
}

const createQueryChainStub = (): QueryChainStub => {
  const stub: QueryChainStub = {
    addOrderBy: vi.fn(),
    andWhere: vi.fn(),
    distinctOn: vi.fn(),
    execute: vi.fn().mockResolvedValue({ affected: 1, raw: [] }),
    getMany: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    where: vi.fn(),
  };

  for (const method of [
    stub.addOrderBy,
    stub.andWhere,
    stub.distinctOn,
    stub.orderBy,
    stub.set,
    stub.update,
    stub.where,
  ]) {
    method.mockReturnValue(stub);
  }

  return stub;
};

describe('ProjectRunsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  let builder = createQueryChainStub();
  let repository: ProjectRunsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    builder = createQueryChainStub();

    const app = await Test.createTestingModule({
      providers: [
        ProjectRunsRepository,
        {
          provide: getRepositoryToken(ProjectRun),
          useValue: createMock<Repository<ProjectRun>>({
            createQueryBuilder: vi.fn(() => {
              return builder;
            }),
            find,
            findOne,
            target: ProjectRun,
          }),
        },
      ],
    }).compile();

    repository = app.get(ProjectRunsRepository);
  });

  describe('findRunById', () => {
    it('returns the row, or null rather than throwing', async () => {
      const run = projectRunsFactory.build({ id: runId });
      findOne.mockResolvedValueOnce(run).mockResolvedValueOnce(null);

      await expect(repository.findRunById(runId)).resolves.toBe(run);
      await expect(repository.findRunById(runId)).resolves.toBeNull();
      expect(findOne).toHaveBeenCalledWith({ where: { id: runId } });
    });
  });

  describe('findActiveByProjectId', () => {
    it('looks for a QUEUED or IN_PROGRESS run of the project', async () => {
      findOne.mockResolvedValue(null);

      await repository.findActiveByProjectId(projectId);

      expect(findOne).toHaveBeenCalledWith({
        where: { projectId, status: In(['IN_PROGRESS', 'QUEUED']) },
      });
    });
  });

  describe('findActive', () => {
    it('lists every active run oldest first', async () => {
      const runs = projectRunsFactory.buildList(2);
      find.mockResolvedValue(runs);

      await expect(repository.findActive()).resolves.toBe(runs);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { status: In(['IN_PROGRESS', 'QUEUED']) },
      });
    });
  });

  describe('findLatestByProjectIds', () => {
    it('skips the query for no ids', async () => {
      await expect(repository.findLatestByProjectIds([])).resolves.toEqual(
        new Map(),
      );
      expect(builder.getMany).not.toHaveBeenCalled();
    });

    it('keys the newest run of each project by project id', async () => {
      const run = projectRunsFactory.build({ projectId });
      builder.getMany.mockResolvedValue([run]);

      const latest = await repository.findLatestByProjectIds([projectId]);

      expect(latest.get(projectId)).toBe(run);
      expect(builder.distinctOn).toHaveBeenCalledWith(['run.project_id']);
      expect(builder.addOrderBy).toHaveBeenCalledWith('run.created_at', 'DESC');
    });
  });

  describe('guarded transitions', () => {
    it('setCurrentPlan moves an active run to IN_PROGRESS on the plan', async () => {
      await expect(repository.setCurrentPlan(runId, planId)).resolves.toBe(
        true,
      );
      expect(builder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPlanId: planId,
          status: PROJECT_RUN_STATUS.IN_PROGRESS,
        }),
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        'status IN (:...activeStatuses)',
        { activeStatuses: ['IN_PROGRESS', 'QUEUED'] },
      );
    });

    it('settleStopped records the stopping plan and reason', async () => {
      await expect(
        repository.settleStopped(runId, planId, 'FAILED'),
      ).resolves.toBe(true);
      expect(builder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          settledAt: expect.any(Date),
          status: PROJECT_RUN_STATUS.STOPPED,
          stoppedByPlanId: planId,
          stoppedReason: 'FAILED',
        }),
      );
    });

    it('settleCompleted and settleCancelled stamp settled_at', async () => {
      await repository.settleCompleted(runId);
      await repository.settleCancelled(runId);

      expect(builder.set).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ status: PROJECT_RUN_STATUS.COMPLETED }),
      );
      expect(builder.set).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ status: PROJECT_RUN_STATUS.CANCELLED }),
      );
    });

    it('reports a lost race when the guard matches no row', async () => {
      builder.execute.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repository.settleCompleted(runId)).resolves.toBe(false);
    });
  });

  describe('stampCancelRequested', () => {
    it('stamps only an active run with no marker yet', async () => {
      await expect(
        repository.stampCancelRequested(runId, 'user-1'),
      ).resolves.toBe(true);
      expect(builder.set).toHaveBeenCalledWith({
        cancelRequestedAt: expect.any(Date),
        cancelRequestedBy: 'user-1',
      });
      expect(builder.andWhere).toHaveBeenCalledWith(
        'cancel_requested_at IS NULL',
      );
    });

    it('reports false for a repeat request', async () => {
      builder.execute.mockResolvedValue({ affected: undefined, raw: [] });

      await expect(repository.stampCancelRequested(runId, null)).resolves.toBe(
        false,
      );
    });
  });
});
