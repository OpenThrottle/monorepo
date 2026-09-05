import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkLedgerService } from '@openthrottle/nestjs-repositories';
import type {
  WorkArtifact,
  WorkSessionSubject,
} from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';
import type { TaggingEnqueueService } from '../tagging/tagging-enqueue.service';
import { WorkLedgerVerifyProcessor } from './work-ledger-verify.processor';
import type { WorkLedgerVerifyJob } from './work-ledger-verify.types';

const RECENT = new Date();
const OLD = new Date('2020-01-01T00:00:00Z');

function artifact(overrides: Partial<WorkArtifact>): WorkArtifact {
  return createMock<WorkArtifact>({
    id: 'art-1',
    lifecycle: 'created',
    payload: { repo: 'OpenThrottle/monorepo', sha: 'abc' },
    producedAt: RECENT,
    sessionId: 'sess-1',
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
