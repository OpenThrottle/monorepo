import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunsRepository } from '@openthrottle/nestjs-repositories-server';
import type {
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
  WorkSessionSubject,
  WorkSessionSubjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PlanRunsRepositoryMock,
  WorkArtifactsRepositoryMock,
  WorkSessionsRepositoryMock,
  WorkSessionSubjectsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlanRunsRepositoryMock,
  createWorkArtifactsRepositoryMock,
  createWorkSessionsRepositoryMock,
  createWorkSessionSubjectsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import type { FindManyOptions } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GitHubForgeService } from '../../services/source-control/github-forge/github-forge.service.ts';
import { GitLabForgeService } from '../../services/source-control/gitlab-forge/gitlab-forge.service.ts';
import { SourceControlService } from '../../services/source-control/source-control.service.ts';
import type { TaggingEnqueueService } from '../tagging/enqueue/enqueue.service.ts';
import { WorkLedgerVerifyProcessor } from './work-ledger-verify.processor.ts';
import type { WorkLedgerVerifyJob } from './work-ledger-verify.types.ts';

/** The two sweeps are told apart by the `type` in their where clause. */
function findTypeOf(options?: FindManyOptions<WorkArtifact>): unknown {
  const where = options?.where;
  if (where == null || Array.isArray(where)) return undefined;
  return where.type;
}

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');
const RECENT = new Date(FIXED_NOW);
const OLD = new Date('2020-01-01T00:00:00Z');

// The processor ages artifacts against the clock, so pin it to the same
// instant RECENT was stamped with.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function artifact(overrides: Partial<WorkArtifact>): WorkArtifact {
  return createMock<WorkArtifact>({
    id: 'art-1',
    lifecycle: 'created',
    payload: { repo: 'OpenThrottle/monorepo', sha: 'abc' },
    producedAt: RECENT,
    sessionId: 'sess-1',
    source: 'agent',
    type: 'git_commit',
    verification: 'unverified',
    ...overrides,
  });
}

const commitDetail = {
  additions: 1,
  deletions: 0,
  files: [],
  message: 'm',
  sha: 'abc',
};

describe('WorkLedgerVerifyProcessor', () => {
  let githubService: GitHubService;
  let artifactRepo: WorkArtifactsRepositoryMock;
  let subjectRepo: WorkSessionSubjectsRepositoryMock;
  let taggingEnqueueService: TaggingEnqueueService;
  let processor: WorkLedgerVerifyProcessor;

  const job = createMock<WorkLedgerVerifyJob>({ id: 'sweep-1' });

  beforeEach(() => {
    githubService = createMock<GitHubService>();
    artifactRepo = createWorkArtifactsRepositoryMock();
    artifactRepo.update.mockImplementation(async (id) => {
      return createMock<WorkArtifact>({ id });
    });
    subjectRepo = createWorkSessionSubjectsRepositoryMock();
    taggingEnqueueService = createMock<TaggingEnqueueService>();

    subjectRepo.findBy.mockResolvedValue([
      createMock<WorkSessionSubject>({ planId: 'plan-1', sessionId: 'sess-1' }),
    ]);
    vi.mocked(githubService.getDefaultBranch).mockResolvedValue('main');
    // Both sweeps call find(); default everything to empty and let each test opt in.
    artifactRepo.findBy.mockResolvedValue([]);

    processor = new WorkLedgerVerifyProcessor(
      createMock<LoggerService>(),
      createMock<PlanRunsRepository>(createPlanRunsRepositoryMock()),
      new SourceControlService(
        new GitHubForgeService(githubService),
        new GitLabForgeService(createMock<ConfigService>()),
      ),
      taggingEnqueueService,
      createMock<WorkArtifactsRepository>(artifactRepo),
      createMock<WorkSessionsRepository>(createWorkSessionsRepositoryMock()),
      createMock<WorkSessionSubjectsRepository>(subjectRepo),
    );
  });

  it('promotes a directly-reachable commit to landed and enqueues refine per subject plan', async () => {
    artifactRepo.findBy.mockResolvedValue([artifact({})]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('behind');

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'abc' }),
        verification: 'verified',
      }),
    );
    expect(taggingEnqueueService.enqueueRefine).toHaveBeenCalledWith(
      'plan-1',
      'github',
      'OpenThrottle/monorepo',
      'abc',
    );
  });

  it('lands a bulk-sourced artifact without enqueueing any refine', async () => {
    // The task-5 demotion puts ~1k legacy rows back in this queue. They must land silently:
    // one refine per subject plan would mean ~1k LLM calls re-tagging long-finished work.
    artifactRepo.findBy.mockResolvedValue([artifact({ source: 'legacy' })]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('behind');

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ lifecycle: 'landed' }),
    );
    expect(taggingEnqueueService.enqueueRefine).not.toHaveBeenCalled();
  });

  it('lands an adapter-sourced artifact without enqueueing any refine', async () => {
    artifactRepo.findBy.mockResolvedValue([artifact({ source: 'adapter' })]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('behind');

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ lifecycle: 'landed' }),
    );
    expect(taggingEnqueueService.enqueueRefine).not.toHaveBeenCalled();
  });

  it('maps a squash-merged commit to its merge_commit_sha and lands that', async () => {
    artifactRepo.findBy.mockResolvedValue([artifact({})]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    // Branch sha is not on main (diverged); its merged PR's squash sha is.
    vi.mocked(githubService.compareCommitStatus).mockImplementation(
      async (_o, _r, _base, head) =>
        head === 'squash-sha' ? 'behind' : 'diverged',
    );
    vi.mocked(githubService.getMergeCommitShaForCommit).mockResolvedValue(
      'squash-sha',
    );

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'squash-sha' }),
      }),
    );
    expect(taggingEnqueueService.enqueueRefine).toHaveBeenCalledWith(
      'plan-1',
      'github',
      'OpenThrottle/monorepo',
      'squash-sha',
    );
  });

  it('verifies existence but does not land or refine when not yet reachable', async () => {
    artifactRepo.findBy.mockResolvedValue([artifact({})]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('diverged');
    vi.mocked(githubService.getMergeCommitShaForCommit).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ verification: 'verified' }),
    );
    expect(artifactRepo.update).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ lifecycle: 'landed' }),
    );
    expect(taggingEnqueueService.enqueueRefine).not.toHaveBeenCalled();
  });

  it('orphans a commit GitHub cannot find once past the grace window', async () => {
    artifactRepo.findBy.mockResolvedValue([artifact({ producedAt: OLD })]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ verification: 'orphaned' }),
    );
  });

  it('leaves a not-found commit pending while within the grace window', async () => {
    artifactRepo.findBy.mockResolvedValue([artifact({ producedAt: RECENT })]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.update).not.toHaveBeenCalled();
  });

  it('skips malformed payloads without calling GitHub', async () => {
    artifactRepo.findBy.mockResolvedValue([
      artifact({ payload: { repo: 'no-slash', sha: 'abc' } }),
    ]);

    await processor.process(job);

    expect(githubService.getCommitDetail).not.toHaveBeenCalled();
    expect(artifactRepo.update).not.toHaveBeenCalled();
  });
});

describe('WorkLedgerVerifyProcessor pull_request sweep', () => {
  // pull_request was registered in the type registry but nothing ever verified it, so every
  // row written sat at lifecycle='open', unverified, forever.
  let githubService: GitHubService;
  let artifactRepo: WorkArtifactsRepositoryMock;
  let subjectRepo: WorkSessionSubjectsRepositoryMock;
  let taggingEnqueueService: TaggingEnqueueService;
  let planRunsRepository: PlanRunsRepositoryMock;
  let sessionRepo: WorkSessionsRepositoryMock;
  let processor: WorkLedgerVerifyProcessor;

  const job = createMock<WorkLedgerVerifyJob>({ id: 'sweep-1' });

  function pullArtifact(overrides: Partial<WorkArtifact> = {}): WorkArtifact {
    return createMock<WorkArtifact>({
      id: 'pr-1',
      lifecycle: 'open',
      payload: { number: 537, repo: 'OpenThrottle/monorepo' },
      producedAt: RECENT,
      sessionId: 'sess-1',
      source: 'agent',
      type: 'pull_request',
      verification: 'unverified',
      ...overrides,
    });
  }

  const pullDetail = {
    additions: 1,
    author: 'visormatt',
    changedFiles: 1,
    deletions: 0,
    mergeCommitSha: null,
    mergedAt: null,
    number: 537,
    state: 'open',
  };

  /** git_commit sweep finds nothing; pull_request sweep finds these. */
  function onlyPulls(pulls: WorkArtifact[]): void {
    artifactRepo.findBy.mockImplementation(async (options) =>
      findTypeOf(options) === 'pull_request' ? pulls : [],
    );
  }

  beforeEach(() => {
    githubService = createMock<GitHubService>();
    artifactRepo = createWorkArtifactsRepositoryMock();
    artifactRepo.update.mockImplementation(async (id) => {
      return createMock<WorkArtifact>({ id });
    });
    subjectRepo = createWorkSessionSubjectsRepositoryMock();
    taggingEnqueueService = createMock<TaggingEnqueueService>();

    subjectRepo.findBy.mockResolvedValue([
      createMock<WorkSessionSubject>({ planId: 'plan-1', sessionId: 'sess-1' }),
    ]);
    artifactRepo.findBy.mockResolvedValue([]);

    planRunsRepository = createPlanRunsRepositoryMock();
    planRunsRepository.settleUnsupervisedRunForPullRequest.mockResolvedValue(
      null,
    );
    sessionRepo = createWorkSessionsRepositoryMock();
    sessionRepo.findOne.mockResolvedValue(
      createMock<WorkSession>({ id: 'sess-1', planRunId: 'run-1' }),
    );

    processor = new WorkLedgerVerifyProcessor(
      createMock<LoggerService>(),
      createMock<PlanRunsRepository>(planRunsRepository),
      new SourceControlService(
        new GitHubForgeService(githubService),
        new GitLabForgeService(createMock<ConfigService>()),
      ),
      taggingEnqueueService,
      createMock<WorkArtifactsRepository>(artifactRepo),
      createMock<WorkSessionsRepository>(sessionRepo),
      createMock<WorkSessionSubjectsRepository>(subjectRepo),
    );
  });

  it('advances a merged PR and records its merge_commit_sha', async () => {
    onlyPulls([pullArtifact()]);
    vi.mocked(githubService.getPullDetail).mockResolvedValue({
      ...pullDetail,
      mergeCommitSha: 'squash-sha',
      mergedAt: '2026-09-01T00:00:00Z',
      state: 'closed',
    });

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        lifecycle: 'merged',
        payload: expect.objectContaining({ mergeCommitSha: 'squash-sha' }),
        verification: 'verified',
      }),
    );
  });

  it('advances a PR closed without merging to closed, not merged', async () => {
    onlyPulls([pullArtifact()]);
    vi.mocked(githubService.getPullDetail).mockResolvedValue({
      ...pullDetail,
      mergedAt: null,
      state: 'closed',
    });

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ lifecycle: 'closed' }),
    );
  });

  it('settles the run behind a merged PR, and the one behind a closed PR', async () => {
    onlyPulls([
      pullArtifact(),
      pullArtifact({ id: 'pr-2', sessionId: 'sess-2' }),
    ]);
    vi.mocked(githubService.getPullDetail)
      .mockResolvedValueOnce({
        ...pullDetail,
        mergeCommitSha: 'squash-sha',
        mergedAt: '2026-09-01T00:00:00Z',
        state: 'closed',
      })
      .mockResolvedValueOnce({
        ...pullDetail,
        mergedAt: null,
        state: 'closed',
      });

    await processor.process(job);

    expect(
      planRunsRepository.settleUnsupervisedRunForPullRequest,
    ).toHaveBeenNthCalledWith(1, 'run-1', 'merged');
    expect(
      planRunsRepository.settleUnsupervisedRunForPullRequest,
    ).toHaveBeenNthCalledWith(2, 'run-1', 'closed');
  });

  it('settles nothing for an open PR or a session with no plan run', async () => {
    onlyPulls([pullArtifact()]);
    vi.mocked(githubService.getPullDetail).mockResolvedValue(pullDetail);

    await processor.process(job);

    sessionRepo.findOne.mockResolvedValue(
      createMock<WorkSession>({ id: 'sess-1', planRunId: null }),
    );
    vi.mocked(githubService.getPullDetail).mockResolvedValue({
      ...pullDetail,
      mergedAt: null,
      state: 'closed',
    });
    await processor.process(job);

    expect(
      planRunsRepository.settleUnsupervisedRunForPullRequest,
    ).not.toHaveBeenCalled();
  });

  it('verifies a still-open PR without advancing its lifecycle', async () => {
    onlyPulls([pullArtifact()]);
    vi.mocked(githubService.getPullDetail).mockResolvedValue(pullDetail);

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ lifecycle: 'open', verification: 'verified' }),
    );
  });

  it('repairs an orphaned sibling commit from the merged PR merge sha', async () => {
    // The case this exists for: a branch sha recorded at PR-open, then rebased away before
    // the merge. On its own it can never be found again — but the PR knows what it became.
    const orphan = createMock<WorkArtifact>({
      id: 'commit-1',
      lifecycle: 'created',
      payload: { repo: 'OpenThrottle/monorepo', sha: 'rebased-away' },
      producedAt: RECENT,
      sessionId: 'sess-1',
      source: 'agent',
      type: 'git_commit',
      verification: 'orphaned',
    });
    artifactRepo.findBy.mockImplementation(async (options) => {
      const type = findTypeOf(options);
      if (type === 'pull_request') return [pullArtifact()];
      if (type === 'git_commit') return [orphan];
      return [];
    });
    vi.mocked(githubService.getPullDetail).mockResolvedValue({
      ...pullDetail,
      mergeCommitSha: 'squash-sha',
      mergedAt: '2026-09-01T00:00:00Z',
      state: 'closed',
    });
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.update).toHaveBeenCalledWith(
      'commit-1',
      expect.objectContaining({
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'squash-sha' }),
        verification: 'verified',
      }),
    );
  });

  it('skips a malformed payload without calling GitHub', async () => {
    onlyPulls([pullArtifact({ payload: { repo: 'OpenThrottle/monorepo' } })]);

    await processor.process(job);

    expect(githubService.getPullDetail).not.toHaveBeenCalled();
  });
});
