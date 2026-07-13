import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { GitHubService } from '@openthrottle/nestjs-github';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { WorkLedgerService } from '@openthrottle/nestjs-repositories';
import type { WorkArtifact } from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';
import { WorkLedgerVerifyProcessor } from './work-ledger-verify.processor';
import type { WorkLedgerVerifyJob } from './work-ledger-verify.types';

function artifact(id: string, repo: unknown, sha: unknown): WorkArtifact {
  return createMock<WorkArtifact>({
    id,
    payload: { repo, sha },
    verification: 'unverified',
  });
}

describe('WorkLedgerVerifyProcessor', () => {
  let githubService: GitHubService;
  let artifactRepo: Repository<WorkArtifact>;
  let workLedgerService: WorkLedgerService;
  let processor: WorkLedgerVerifyProcessor;

  const job = createMock<WorkLedgerVerifyJob>({ id: 'sweep-1' });

  beforeEach(() => {
    githubService = createMock<GitHubService>();
    artifactRepo = createMock<Repository<WorkArtifact>>();
    workLedgerService = createMock<WorkLedgerService>({
      getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
    });
    processor = new WorkLedgerVerifyProcessor(
      githubService,
      createMock<LoggerService>(),
      workLedgerService,
    );
  });

  it('promotes an existing commit to verified and leaves a missing one unverified', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact('a-found', 'OpenThrottle/monorepo', 'abc'),
      artifact('a-missing', 'OpenThrottle/monorepo', 'gone'),
    ]);
    vi.mocked(githubService.getCommitDetail).mockImplementation(
      async (_owner, _repo, sha) =>
        sha === 'abc'
          ? { additions: 1, deletions: 0, files: [], message: 'm', sha: 'abc' }
          : null,
    );

    await processor.process(job);

    // Only the found commit is saved, flipped to verified.
    expect(artifactRepo.save).toHaveBeenCalledTimes(1);
    expect(artifactRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-found', verification: 'verified' }),
    );
  });

  it('skips malformed repo payloads without calling GitHub', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact('a-bad', 'no-slash', 'abc'),
      artifact('a-null', null, 'abc'),
    ]);

    await processor.process(job);

    expect(githubService.getCommitDetail).not.toHaveBeenCalled();
    expect(artifactRepo.save).not.toHaveBeenCalled();
  });

  it('continues past a transport error and does not verify that artifact', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([
      artifact('a-err', 'OpenThrottle/monorepo', 'abc'),
    ]);
    vi.mocked(githubService.getCommitDetail).mockRejectedValue(
      new Error('rate limited'),
    );

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(artifactRepo.save).not.toHaveBeenCalled();
  });

  it('queries only unverified git_commit artifacts', async () => {
    vi.mocked(artifactRepo.find).mockResolvedValue([]);

    await processor.process(job);

    expect(artifactRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'git_commit', verification: 'unverified' },
      }),
    );
  });
});
