import { createMock } from '@golevelup/ts-vitest';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlansService,
  RepositoriesService,
  Repository as RepositoryEntity,
  ServiceAccountsService,
  UsersService,
  WorkArtifact,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkLedgerHarvestProcessor } from './work-ledger-harvest.processor.ts';
import type { WorkLedgerHarvestJob } from './work-ledger-harvest.types.ts';

const PLAN = '75e8cd5c-58fc-467d-bbd3-33d552bb51f7';

function repository(
  overrides: Partial<RepositoryEntity> = {},
): RepositoryEntity {
  // Assigned onto a bare mock rather than passed into createMock: the entity's optional
  // relation property does not fit createMock's PartialFuncReturn parameter type.
  return Object.assign(
    createMock<RepositoryEntity>(),
    {
      defaultBranch: 'main',
      id: 'repository-1',
      ledgerHarvestCursor: null,
      ledgerHarvestEnabled: true,
      name: 'OpenThrottle/monorepo',
      normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
    },
    overrides,
  );
}

const trailerCommit = {
  authorLogin: 'visormatt',
  message: `feat: a thing\n\nPlan-Id: ${PLAN}`,
  sha: 'sha-1',
};

describe('WorkLedgerHarvestProcessor', () => {
  const savedArtifacts: unknown[] = [];
  const savedSubjects: unknown[] = [];

  let githubService: GitHubService;
  let repositoriesService: RepositoriesService;
  let repositoryRepo: Repository<RepositoryEntity>;
  let artifactRepo: Repository<WorkArtifact>;
  let logger: LoggerService;
  let processor: WorkLedgerHarvestProcessor;

  const job = createMock<WorkLedgerHarvestJob>({ id: 'sweep-1' });

  const transaction = vi.fn(
    async (run: (manager: unknown) => Promise<void>): Promise<void> => {
      const manager = {
        getRepository: (entity: { name: string }) => ({
          create: (data: Record<string, unknown>) => ({
            id: `${entity.name}-id`,
            ...data,
          }),
          save: (rows: unknown) => {
            if (entity.name === 'WorkArtifact') savedArtifacts.push(rows);
            if (entity.name === 'WorkSessionSubject') savedSubjects.push(rows);
            return Promise.resolve(rows);
          },
        }),
      };
      await run(manager);
    },
  );

  beforeEach(() => {
    vi.clearAllMocks();
    savedArtifacts.length = 0;
    savedSubjects.length = 0;

    githubService = createMock<GitHubService>();
    vi.mocked(githubService.listCommits).mockResolvedValue([]);

    repositoryRepo = createMock<Repository<RepositoryEntity>>();
    vi.mocked(repositoryRepo.find).mockResolvedValue([repository()]);

    artifactRepo = createMock<Repository<WorkArtifact>>({
      manager: { transaction },
    });
    vi.mocked(artifactRepo.findOne).mockResolvedValue(null);

    repositoriesService = createMock<RepositoriesService>({
      getRepository: vi.fn().mockReturnValue(repositoryRepo),
    });
    logger = createMock<LoggerService>();

    processor = new WorkLedgerHarvestProcessor(
      githubService,
      logger,
      createMock<PlansService>({
        getRepository: vi.fn().mockReturnValue({
          createQueryBuilder: () => ({
            getMany: async () => [createMock<Plan>({ id: PLAN })],
            limit: () => ({
              getMany: async () => [createMock<Plan>({ id: PLAN })],
            }),
            where: () => ({
              limit: () => ({
                getMany: async () => [createMock<Plan>({ id: PLAN })],
              }),
            }),
          }),
        }),
      }),
      repositoriesService,
      createMock<ServiceAccountsService>({
        findByName: vi.fn().mockResolvedValue({ id: 'service-account-1' }),
      }),
      createMock<UsersService>({
        findByGithubUsername: vi.fn().mockResolvedValue({ id: 'user-1' }),
      }),
      createMock<WorkLedgerService>({
        getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
      }),
    );
  });

  it('adopts a trailer commit as a landed, verified adapter artifact', async () => {
    vi.mocked(githubService.listCommits).mockResolvedValue([trailerCommit]);

    await processor.process(job);

    // Already on the default branch — this is not a claim awaiting verification. Safe to be
    // born landed only because 'adapter' suppresses landed triggers.
    expect(savedArtifacts[0]).toEqual(
      expect.objectContaining({
        externalKey: 'github:OpenThrottle/monorepo@sha-1',
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'sha-1' }),
        source: 'adapter',
        verification: 'verified',
      }),
    );
  });

  it('attaches the referenced plan as a subject', async () => {
    vi.mocked(githubService.listCommits).mockResolvedValue([trailerCommit]);

    await processor.process(job);

    expect(savedSubjects[0]).toEqual([
      expect.objectContaining({ planId: PLAN }),
    ]);
  });

  it('skips a commit with no Plan-Id trailer', async () => {
    vi.mocked(githubService.listCommits).mockResolvedValue([
      { authorLogin: 'visormatt', message: 'chore: tidy', sha: 'sha-2' },
    ]);

    await processor.process(job);

    expect(savedArtifacts).toEqual([]);
  });

  it('does not re-adopt a commit that is already recorded', async () => {
    vi.mocked(githubService.listCommits).mockResolvedValue([trailerCommit]);
    vi.mocked(artifactRepo.findOne).mockResolvedValue(
      createMock<WorkArtifact>({ id: 'existing' }),
    );

    await processor.process(job);

    // The steady state once caught up: every sweep sees commits it has already adopted.
    expect(transaction).not.toHaveBeenCalled();
  });

  it('advances the watermark to the newest commit it examined', async () => {
    vi.mocked(githubService.listCommits).mockResolvedValue([trailerCommit]);

    await processor.process(job);

    expect(repositoryRepo.update).toHaveBeenCalledWith(
      { id: 'repository-1' },
      expect.objectContaining({ ledgerHarvestCursor: 'sha-1' }),
    );
  });

  it('passes the stored cursor to GitHub so only new commits are read', async () => {
    vi.mocked(repositoryRepo.find).mockResolvedValue([
      repository({ ledgerHarvestCursor: 'watermark-sha' }),
    ]);

    await processor.process(job);

    expect(githubService.listCommits).toHaveBeenCalledWith(
      'OpenThrottle',
      'monorepo',
      'main',
      'watermark-sha',
    );
  });

  it('skips a repo with no parseable GitHub remote', async () => {
    vi.mocked(repositoryRepo.find).mockResolvedValue([
      repository({ normalizedRemoteUrl: null }),
    ]);

    await processor.process(job);

    expect(githubService.listCommits).not.toHaveBeenCalled();
  });

  it('skips a repo with no default branch', async () => {
    vi.mocked(repositoryRepo.find).mockResolvedValue([
      repository({ defaultBranch: '' }),
    ]);

    await processor.process(job);

    expect(githubService.listCommits).not.toHaveBeenCalled();
  });

  it('harvests nothing when the service account is missing', async () => {
    processor = new WorkLedgerHarvestProcessor(
      githubService,
      logger,
      createMock<PlansService>(),
      repositoriesService,
      createMock<ServiceAccountsService>({
        findByName: vi.fn().mockResolvedValue(null),
      }),
      createMock<UsersService>(),
      createMock<WorkLedgerService>({
        getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
      }),
    );

    await processor.process(job);

    expect(githubService.listCommits).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('keeps sweeping other repos when one fails', async () => {
    vi.mocked(repositoryRepo.find).mockResolvedValue([
      repository({ id: 'repository-1' }),
      repository({ id: 'repository-2' }),
    ]);
    vi.mocked(githubService.listCommits)
      .mockRejectedValueOnce(new Error('GitHub is down'))
      .mockResolvedValueOnce([trailerCommit]);

    await processor.process(job);

    expect(savedArtifacts).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalled();
  });
});
