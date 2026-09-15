import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRun,
  PlanRunConfigSnapshotV1,
  RepositoriesService,
  RepositoryCheckoutsService,
  ServiceAccountsService,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettleRunLedgerService } from './settle-run-ledger.service.ts';

const PLAN_RUN_ID = 'run-1';

type SavedKey = 'WorkArtifact' | 'WorkSession' | 'WorkSessionSubject';

function isSavedKey(name: string): name is SavedKey {
  return (
    name === 'WorkArtifact' ||
    name === 'WorkSession' ||
    name === 'WorkSessionSubject'
  );
}

/** A full, valid snapshot whose target names `taskId` (empty string = plan-level). */
function snapshot(taskId: string): PlanRunConfigSnapshotV1 {
  return createMock<PlanRunConfigSnapshotV1>({
    target: { mode: 'task', taskId },
  });
}

function planRun(overrides: Partial<PlanRun> = {}): PlanRun {
  return createMock<PlanRun>({
    actorUserId: 'user-1',
    checkoutId: 'checkout-1',
    id: PLAN_RUN_ID,
    planId: 'plan-1',
    runConfigSnapshot: null,
    ...overrides,
  });
}

describe('SettleRunLedgerService', () => {
  const saved: Record<
    'WorkArtifact' | 'WorkSession' | 'WorkSessionSubject',
    unknown[]
  > = {
    WorkArtifact: [],
    WorkSession: [],
    WorkSessionSubject: [],
  };
  const findOne = vi.fn();

  let repositoriesService: RepositoriesService;
  let repositoryCheckoutsService: RepositoryCheckoutsService;
  let serviceAccountsService: ServiceAccountsService;
  let workLedgerService: WorkLedgerService;
  let logger: LoggerService;
  let service: SettleRunLedgerService;

  const transaction = vi.fn(
    async (run: (manager: unknown) => Promise<void>): Promise<void> => {
      const manager = {
        getRepository: (entity: { name: string }) => ({
          create: (data: Record<string, unknown>) => ({
            id: `${entity.name}-id`,
            ...data,
          }),
          findOne,
          save: (rows: unknown) => {
            if (isSavedKey(entity.name)) saved[entity.name].push(rows);
            return Promise.resolve(rows);
          },
        }),
      };
      await run(manager);
    },
  );

  beforeEach(() => {
    vi.clearAllMocks();
    saved.WorkArtifact = [];
    saved.WorkSession = [];
    saved.WorkSessionSubject = [];
    findOne.mockResolvedValue(null);

    repositoryCheckoutsService = createMock<RepositoryCheckoutsService>({
      findById: vi.fn().mockResolvedValue({ repositoryId: 'repository-1' }),
    });
    repositoriesService = createMock<RepositoriesService>({
      findById: vi.fn().mockResolvedValue({ name: 'OpenThrottle/monorepo' }),
    });
    serviceAccountsService = createMock<ServiceAccountsService>({
      findByName: vi.fn().mockResolvedValue({ id: 'service-account-1' }),
    });
    workLedgerService = createMock<WorkLedgerService>({
      getArtifactRepository: vi
        .fn()
        .mockReturnValue({ manager: { transaction } }),
    });
    logger = createMock<LoggerService>();

    service = new SettleRunLedgerService(
      logger,
      repositoriesService,
      repositoryCheckoutsService,
      serviceAccountsService,
      workLedgerService,
    );
  });

  const artifacts = (): Array<{ payload: unknown; type: string }> =>
    saved.WorkArtifact.flat().filter(
      (row): row is { payload: unknown; type: string } =>
        typeof row === 'object' && row !== null && 'type' in row,
    );

  it('records a git_commit and a pull_request with the server-resolved repo', async () => {
    await service.recordSettledRunArtifacts({
      headSha: 'deadbeef',
      planRun: planRun(),
      prNumber: 537,
    });

    // The repo name comes from checkout -> repository, never from the agent: there are two
    // remotes and a wrong one produces an external_key that can never verify.
    expect(artifacts()).toEqual([
      expect.objectContaining({
        externalKey: 'github:OpenThrottle/monorepo@deadbeef',
        payload: { repo: 'OpenThrottle/monorepo', sha: 'deadbeef' },
        type: 'git_commit',
      }),
      expect.objectContaining({
        externalKey: 'github:OpenThrottle/monorepo#537',
        payload: { number: 537, repo: 'OpenThrottle/monorepo' },
        type: 'pull_request',
      }),
    ]);
  });

  it('records only what it was given', async () => {
    await service.recordSettledRunArtifacts({
      headSha: null,
      planRun: planRun(),
      prNumber: 537,
    });

    expect(artifacts().map((artifact) => artifact.type)).toEqual([
      'pull_request',
    ]);
  });

  it('does nothing at all when neither a sha nor a PR is supplied', async () => {
    await service.recordSettledRunArtifacts({
      headSha: null,
      planRun: planRun(),
      prNumber: null,
    });

    // A run that exited before opening a PR correctly records nothing.
    expect(transaction).not.toHaveBeenCalled();
  });

  it('skips an artifact that already exists rather than colliding with the unique index', async () => {
    findOne.mockResolvedValue({ id: 'already-there' });

    await service.recordSettledRunArtifacts({
      headSha: 'deadbeef',
      planRun: planRun(),
      prNumber: 537,
    });

    expect(saved.WorkArtifact).toEqual([]);
  });

  it('attaches the plan as a subject, and the task when the run targeted one', async () => {
    await service.recordSettledRunArtifacts({
      headSha: 'deadbeef',
      planRun: planRun({ runConfigSnapshot: snapshot('task-9') }),
      prNumber: null,
    });

    expect(saved.WorkSessionSubject.at(0)).toEqual(
      expect.objectContaining({ planId: 'plan-1', taskId: 'task-9' }),
    );
  });

  it('falls back to a plan-level subject when the snapshot names no task', async () => {
    await service.recordSettledRunArtifacts({
      headSha: 'deadbeef',
      planRun: planRun({ runConfigSnapshot: snapshot('') }),
      prNumber: null,
    });

    expect(saved.WorkSessionSubject.at(0)).toEqual(
      expect.objectContaining({ taskId: null }),
    );
  });

  it('skips quietly when the run has no checkout to resolve a repo from', async () => {
    await service.recordSettledRunArtifacts({
      headSha: 'deadbeef',
      planRun: planRun({ checkoutId: null }),
      prNumber: 537,
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('never throws — ledger bookkeeping must not fail a settle', async () => {
    transaction.mockRejectedValueOnce(new Error('database is on fire'));

    await expect(
      service.recordSettledRunArtifacts({
        headSha: 'deadbeef',
        planRun: planRun(),
        prNumber: 537,
      }),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalled();
  });
});
