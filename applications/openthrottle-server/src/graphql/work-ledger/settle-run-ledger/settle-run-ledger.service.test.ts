import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunConfigSnapshotV1 } from '@openthrottle/nestjs-repositories';
import type {
  RepositoriesRepository,
  RepositoryCheckoutsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PlanRun,
  PlanRunsRepository,
  ServiceAccountsRepository,
  WorkArtifactsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PlanRunsRepositoryMock,
  ServiceAccountsRepositoryMock,
  WorkArtifactsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createRepositoriesRepositoryMock,
  createRepositoryCheckoutsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlanRunsRepositoryMock,
  createServiceAccountsRepositoryMock,
  createWorkArtifactsRepositoryMock,
  serviceAccountsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitHubForgeService } from '../../../services/source-control/github-forge/github-forge.service.ts';
import { GitLabForgeService } from '../../../services/source-control/gitlab-forge/gitlab-forge.service.ts';
import { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import type { RepositoryInspectionService } from '../../repository-inspection/repository-inspection.service.ts';
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

  let githubService: GitHubService;
  let planRunsRepository: PlanRunsRepositoryMock;
  let endedRuns: PlanRun[];
  let repositoriesRepository: RepositoriesRepository;
  let repositoryCheckoutsRepository: RepositoryCheckoutsRepository;
  let repositoryInspectionService: RepositoryInspectionService;
  let serviceAccounts: ServiceAccountsRepositoryMock;
  let workArtifactsRepository: WorkArtifactsRepositoryMock;
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

    repositoryCheckoutsRepository = asMock<RepositoryCheckoutsRepository>({
      ...createRepositoryCheckoutsRepositoryMock(),
      findCheckoutById: vi
        .fn()
        .mockResolvedValue({ repositoryId: 'repository-1' }),
    });
    repositoriesRepository = asMock<RepositoriesRepository>({
      ...createRepositoriesRepositoryMock(),
      findRepositoryById: vi
        .fn()
        .mockResolvedValue({ name: 'OpenThrottle/monorepo' }),
    });
    serviceAccounts = createServiceAccountsRepositoryMock();
    serviceAccounts.findByName.mockResolvedValue(
      serviceAccountsFactory.build({ id: 'service-account-1' }),
    );
    // One findOne backs both the injected repository and the transaction's repositories, so a
    // test that stubs an existing artifact sees it on either path.
    workArtifactsRepository = createWorkArtifactsRepositoryMock();
    workArtifactsRepository.findOne.mockImplementation(findOne);
    githubService = createMock<GitHubService>();
    endedRuns = [];
    planRunsRepository = createPlanRunsRepositoryMock();
    planRunsRepository.findEndedRunsWithoutPullRequest.mockImplementation(
      async () => {
        return endedRuns;
      },
    );
    repositoryInspectionService = createMock<RepositoryInspectionService>({
      scan: vi.fn().mockResolvedValue({
        git: { normalizedRemoteUrl: 'github.com/openthrottle/monorepo' },
      }),
    });
    logger = createMock<LoggerService>();

    service = new SettleRunLedgerService(
      logger,
      createMock<PlanRunsRepository>(planRunsRepository),
      repositoriesRepository,
      repositoryCheckoutsRepository,
      repositoryInspectionService,
      createMock<ServiceAccountsRepository>(serviceAccounts),
      new SourceControlService(
        new GitHubForgeService(githubService),
        new GitLabForgeService(createMock<ConfigService>()),
      ),
      createMock<WorkArtifactsRepository>(workArtifactsRepository),
      asMock<DataSource>({ transaction }),
    );
  });

  const artifacts = (): Array<{ payload: unknown; type: string }> => {
    return saved.WorkArtifact.flat().filter(
      (row): row is { payload: unknown; type: string } =>
        typeof row === 'object' && row !== null && 'type' in row,
    );
  };

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

  describe('when the repository is not on a supported forge', () => {
    it('records nothing and names the host, rather than writing GitHub rows that can never verify', async () => {
      vi.mocked(repositoriesRepository.findRepositoryById).mockResolvedValue(
        createMock<
          NonNullable<
            Awaited<ReturnType<RepositoriesRepository['findRepositoryById']>>
          >
        >({
          name: 'acme/app',
          normalizedRemoteUrl: 'https://bitbucket.org/acme/app',
        }),
      );

      await service.recordSettledRunArtifacts({
        headSha: 'deadbeef',
        planRun: planRun(),
        prNumber: 537,
      });

      expect(transaction).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('bitbucket.org'),
        expect.anything(),
      );
    });

    it('still treats a repository with no remote at all as GitHub', async () => {
      vi.mocked(repositoriesRepository.findRepositoryById).mockResolvedValue(
        createMock<
          NonNullable<
            Awaited<ReturnType<RepositoriesRepository['findRepositoryById']>>
          >
        >({
          name: 'OpenThrottle/monorepo',
          normalizedRemoteUrl: null,
        }),
      );

      await service.recordSettledRunArtifacts({
        headSha: 'deadbeef',
        planRun: planRun(),
        prNumber: null,
      });

      expect(artifacts()).toEqual([
        expect.objectContaining({
          externalKey: 'github:OpenThrottle/monorepo@deadbeef',
        }),
      ]);
    });

    it('records a GitLab repository under its full nested path', async () => {
      vi.mocked(repositoriesRepository.findRepositoryById).mockResolvedValue(
        createMock<
          NonNullable<
            Awaited<ReturnType<RepositoriesRepository['findRepositoryById']>>
          >
        >({
          name: 'sub/project',
          normalizedRemoteUrl: 'https://gitlab.com/group/sub/project',
        }),
      );

      await service.recordSettledRunArtifacts({
        headSha: null,
        planRun: planRun(),
        prNumber: 9,
      });

      expect(artifacts()).toEqual([
        expect.objectContaining({
          externalKey: 'gitlab:group/sub/project#9',
          payload: { forge: 'gitlab', number: 9, repo: 'group/sub/project' },
        }),
      ]);
    });
  });

  it('skips quietly when the run has nothing to resolve a repo from', async () => {
    await service.recordSettledRunArtifacts({
      headSha: 'deadbeef',
      planRun: planRun({ checkoutId: null }),
      prNumber: 537,
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  /**
   * Mirrors a service-account `enqueuePlanRalphOrchestrator`: actor_user_id is null, so enqueue
   * could only take a raw workingDirectory and the orchestrator skipped worktree checkout
   * registration — the run reaches settle with no checkout_id at all (run f38ce1aa / PR #627).
   */
  describe('when a service account enqueued the run (actor_user_id null, no checkout)', () => {
    function serviceAccountRun(
      workspace: Partial<PlanRunConfigSnapshotV1['workspace']>,
    ): PlanRun {
      return planRun({
        actorUserId: null,
        checkoutId: null,
        runConfigSnapshot: createMock<PlanRunConfigSnapshotV1>({
          target: { mode: 'plan' },
          workspace: {
            checkoutId: undefined,
            repositoryId: undefined,
            workingDirectory: '',
            ...workspace,
          },
        }),
      });
    }

    it('resolves the repo from the snapshot repositoryId', async () => {
      await service.recordSettledRunArtifacts({
        headSha: 'deadbeef',
        planRun: serviceAccountRun({ repositoryId: 'repository-1' }),
        prNumber: 627,
      });

      expect(repositoriesRepository.findRepositoryById).toHaveBeenCalledWith(
        'repository-1',
      );
      expect(repositoryInspectionService.scan).not.toHaveBeenCalled();
      expect(artifacts().map((artifact) => artifact.type)).toEqual([
        'git_commit',
        'pull_request',
      ]);
    });

    it('resolves the repo from the working directory remote and writes both artifacts', async () => {
      vi.mocked(
        repositoriesRepository.findByNormalizedRemoteUrl,
      ).mockResolvedValue(
        createMock<
          NonNullable<
            Awaited<ReturnType<RepositoriesRepository['findRepositoryById']>>
          >
        >({
          name: 'OpenThrottle/monorepo',
          normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
        }),
      );

      await service.recordSettledRunArtifacts({
        headSha: 'deadbeef',
        planRun: serviceAccountRun({
          workingDirectory: '/worktrees/OpenThrottle/monorepo/plan-a68b3a2c',
        }),
        prNumber: 627,
      });

      expect(repositoryInspectionService.scan).toHaveBeenCalledWith(
        '/worktrees/OpenThrottle/monorepo/plan-a68b3a2c',
      );
      expect(
        repositoriesRepository.findByNormalizedRemoteUrl,
      ).toHaveBeenCalledWith('github.com/openthrottle/monorepo');
      expect(artifacts()).toEqual([
        expect.objectContaining({
          externalKey: 'github:OpenThrottle/monorepo@deadbeef',
          type: 'git_commit',
        }),
        expect.objectContaining({
          externalKey: 'github:OpenThrottle/monorepo#627',
          type: 'pull_request',
        }),
      ]);
      // No user verified the run, so the session must not claim one.
      expect(saved.WorkSession.at(0)).toEqual(
        expect.objectContaining({
          onBehalfOfUserId: null,
          onBehalfOfVerified: false,
        }),
      );
    });

    it('skips with a warning when the remote matches no registered repository', async () => {
      vi.mocked(
        repositoriesRepository.findByNormalizedRemoteUrl,
      ).mockResolvedValue(null);

      await service.recordSettledRunArtifacts({
        headSha: 'deadbeef',
        planRun: serviceAccountRun({ workingDirectory: '/somewhere/else' }),
        prNumber: 627,
      });

      expect(transaction).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
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

  describe('linkPullRequestsForUnreportedRuns', () => {
    const pullDetail = {
      additions: 0,
      author: 'octocat',
      changedFiles: 0,
      deletions: 0,
      mergeCommitSha: null,
      mergedAt: null,
      number: 612,
      state: 'open',
    };

    beforeEach(() => {
      vi.mocked(githubService.listPulls).mockResolvedValue([
        createMock<Awaited<ReturnType<GitHubService['listPulls']>>[number]>({
          number: 612,
        }),
      ]);
      vi.mocked(githubService.getPullDetail).mockResolvedValue(pullDetail);
    });

    it('records the PR found on an ended run branch as an adapter artifact under the run', async () => {
      endedRuns = [planRun({ branch: 'feat/x', status: 'FAILED' })];

      await expect(service.linkPullRequestsForUnreportedRuns()).resolves.toBe(
        1,
      );

      expect(githubService.listPulls).toHaveBeenCalledWith(
        'OpenThrottle',
        'monorepo',
        { head: 'feat/x', state: 'all' },
      );
      expect(artifacts()).toEqual([
        expect.objectContaining({
          externalKey: 'github:OpenThrottle/monorepo#612',
          payload: { number: 612, repo: 'OpenThrottle/monorepo' },
          source: 'adapter',
          type: 'pull_request',
        }),
      ]);
      expect(saved.WorkSession).toEqual([
        expect.objectContaining({ planRunId: PLAN_RUN_ID }),
      ]);
    });

    it('links nothing when the forge has no request on the branch', async () => {
      endedRuns = [planRun({ branch: 'feat/x', status: 'FAILED' })];
      vi.mocked(githubService.listPulls).mockResolvedValue([]);

      await expect(service.linkPullRequestsForUnreportedRuns()).resolves.toBe(
        0,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('opens no session when the request is already on the ledger', async () => {
      endedRuns = [planRun({ branch: 'feat/x', status: 'STALE' })];
      findOne.mockResolvedValue({ id: 'artifact-1' });

      await expect(service.linkPullRequestsForUnreportedRuns()).resolves.toBe(
        0,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('never throws when the forge errors', async () => {
      endedRuns = [planRun({ branch: 'feat/x', status: 'FAILED' })];
      vi.mocked(githubService.listPulls).mockRejectedValue(new Error('502'));

      await expect(service.linkPullRequestsForUnreportedRuns()).resolves.toBe(
        0,
      );
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
