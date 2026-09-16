import { createMock } from '@golevelup/ts-vitest';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkLedgerService } from '@openthrottle/nestjs-repositories';
import type {
  WorkArtifact,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import type { FindManyOptions, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaggingEnqueueService } from '../tagging/tagging-enqueue.service.ts';
import { WorkLedgerVerifyProcessor } from './work-ledger-verify.processor.ts';
import type { WorkLedgerVerifyJob } from './work-ledger-verify.types.ts';

/** The two sweeps are told apart by the `type` in their where clause. */
function findTypeOf(options?: FindManyOptions<WorkArtifact>): unknown {
  const where = options?.where;
  if (where == null || Array.isArray(where)) return undefined;
  return where.type;
}

const RECENT = new Date();
const OLD = new Date('2020-01-01T00:00:00Z');

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
  let artifactRepo: Repository<WorkArtifact>;
  let subjectRepo: Repository<WorkSessionSubject>;
  let taggingEnqueueService: TaggingEnqueueService;
  let workLedgerService: WorkLedgerService;
  let processor: WorkLedgerVerifyProcessor;

  const job = createMock<WorkLedgerVerifyJob>({ id: 'sweep-1' });

  beforeEach(() => {
    githubService = createMock<GitHubService>();
    artifactRepo = createMock<Repository<WorkArtifact>>();
    subjectRepo = createMock<Repository<WorkSessionSubject>>();
    taggingEnqueueService = createMock<TaggingEnqueueService>();

    vi.mocked(subjectRepo.find).mockResolvedValue([
      createMock<WorkSessionSubject>({ planId: 'plan-1', sessionId: 'sess-1' }),
    ]);
    vi.mocked(githubService.getDefaultBranch).mockResolvedValue('main');
    // Both sweeps call find(); default everything to empty and let each test opt in.
    vi.mocked(artifactRepo.find).mockResolvedValue([]);

    workLedgerService = createMock<WorkLedgerService>({
      getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
      getSubjectRepository: vi.fn().mockReturnValue(subjectRepo),
    });
    processor = new WorkLedgerVerifyProcessor(
      githubService,
      createMock<LoggerService>(),
      taggingEnqueueService,
      workLedgerService,
    );
  });

  it('promotes a directly-reachable commit to landed and enqueues refine per subject plan', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([artifact({})]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('behind');

    await processor.process(job);

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'abc' }),
        verification: 'verified',
      }),
    );
    expect(taggingEnqueueService.enqueueRefine).toHaveBeenCalledWith(
      'plan-1',
      'OpenThrottle/monorepo',
      'abc',
    );
  });

  it('lands a bulk-sourced artifact without enqueueing any refine', async () => {
    // The task-5 demotion puts ~1k legacy rows back in this queue. They must land silently:
    // one refine per subject plan would mean ~1k LLM calls re-tagging long-finished work.
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact({ source: 'legacy' }),
    ]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('behind');

    await processor.process(job);

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'landed' }),
    );
    expect(taggingEnqueueService.enqueueRefine).not.toHaveBeenCalled();
  });

  it('lands an adapter-sourced artifact without enqueueing any refine', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact({ source: 'adapter' }),
    ]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('behind');

    await processor.process(job);

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'landed' }),
    );
    expect(taggingEnqueueService.enqueueRefine).not.toHaveBeenCalled();
  });

  it('maps a squash-merged commit to its merge_commit_sha and lands that', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([artifact({})]);
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

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'squash-sha' }),
      }),
    );
    expect(taggingEnqueueService.enqueueRefine).toHaveBeenCalledWith(
      'plan-1',
      'OpenThrottle/monorepo',
      'squash-sha',
    );
  });

  it('verifies existence but does not land or refine when not yet reachable', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([artifact({})]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(commitDetail);
    vi.mocked(githubService.compareCommitStatus).mockResolvedValue('diverged');
    vi.mocked(githubService.getMergeCommitShaForCommit).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ verification: 'verified' }),
    );
    expect(artifactRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'landed' }),
    );
    expect(taggingEnqueueService.enqueueRefine).not.toHaveBeenCalled();
  });

  it('orphans a commit GitHub cannot find once past the grace window', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact({ producedAt: OLD }),
    ]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ verification: 'orphaned' }),
    );
  });

  it('leaves a not-found commit pending while within the grace window', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact({ producedAt: RECENT }),
    ]);
    vi.mocked(githubService.getCommitDetail).mockResolvedValue(null);

    await processor.process(job);

    expect(artifactRepo.save).not.toHaveBeenCalled();
  });

  it('skips malformed payloads without calling GitHub', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact({ payload: { repo: 'no-slash', sha: 'abc' } }),
    ]);

    await processor.process(job);

    expect(githubService.getCommitDetail).not.toHaveBeenCalled();
    expect(artifactRepo.save).not.toHaveBeenCalled();
  });
});

describe('WorkLedgerVerifyProcessor pull_request sweep', () => {
  // pull_request was registered in the type registry but nothing ever verified it, so every
  // row written sat at lifecycle='open', unverified, forever.
  let githubService: GitHubService;
  let artifactRepo: Repository<WorkArtifact>;
  let subjectRepo: Repository<WorkSessionSubject>;
  let taggingEnqueueService: TaggingEnqueueService;
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
    vi.mocked(artifactRepo.find).mockImplementation(async (options) =>
      findTypeOf(options) === 'pull_request' ? pulls : [],
    );
  }

  beforeEach(() => {
    githubService = createMock<GitHubService>();
    artifactRepo = createMock<Repository<WorkArtifact>>();
    subjectRepo = createMock<Repository<WorkSessionSubject>>();
    taggingEnqueueService = createMock<TaggingEnqueueService>();

    vi.mocked(subjectRepo.find).mockResolvedValue([
      createMock<WorkSessionSubject>({ planId: 'plan-1', sessionId: 'sess-1' }),
    ]);
    vi.mocked(artifactRepo.find).mockResolvedValue([]);

    processor = new WorkLedgerVerifyProcessor(
      githubService,
      createMock<LoggerService>(),
      taggingEnqueueService,
      createMock<WorkLedgerService>({
        getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
        getSubjectRepository: vi.fn().mockReturnValue(subjectRepo),
      }),
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

    expect(artifactRepo.save).toHaveBeenCalledWith(
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

    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: 'closed' }),
    );
  });

  it('verifies a still-open PR without advancing its lifecycle', async () => {
    onlyPulls([pullArtifact()]);
    vi.mocked(githubService.getPullDetail).mockResolvedValue(pullDetail);

    await processor.process(job);

    expect(artifactRepo.save).toHaveBeenCalledWith(
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
    vi.mocked(artifactRepo.find).mockImplementation(async (options) => {
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

    expect(artifactRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'commit-1',
        lifecycle: 'landed',
        payload: expect.objectContaining({ landedSha: 'squash-sha' }),
        verification: 'verified',
      }),
    ]);
  });

  it('skips a malformed payload without calling GitHub', async () => {
    onlyPulls([pullArtifact({ payload: { repo: 'OpenThrottle/monorepo' } })]);

    await processor.process(job);

    expect(githubService.getPullDetail).not.toHaveBeenCalled();
  });
});
