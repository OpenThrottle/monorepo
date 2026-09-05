import { createMock } from '@golevelup/ts-vitest';
import type {
  WorkArtifact,
  WorkLedgerService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkLedgerResolver } from './work-ledger.resolver';

describe('WorkLedgerResolver.recordWorkArtifact', () => {
  // Plain mock repo (not createMock<Repository>) so create/save take simple
  // implementations without fighting TypeORM's overloaded signatures. It mirrors
  // TypeORM without a live DB: create echoes the partial, save echoes the entity —
  // and deliberately does NOT synthesize the `produced_at DEFAULT now()` DB default,
  // so a create path that omits producedAt surfaces as undefined here, which is
  // exactly the regression this test guards against.
  const repo = {
    create: vi.fn((data: Record<string, unknown>) => data),
    findOne: vi.fn(),
    save: vi.fn((entity: WorkArtifact) => Promise.resolve(entity)),
  };

  let workLedgerService: WorkLedgerService;
  let resolver: WorkLedgerResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    repo.findOne.mockResolvedValue(null);
    workLedgerService = createMock<WorkLedgerService>({
      getArtifactRepository: vi.fn().mockReturnValue(repo),
    });
    resolver = new WorkLedgerResolver(workLedgerService);
  });

  const gitCommitInput = {
    message: 'feat: thing (#1)',
    payloadJson: JSON.stringify({
      repo: 'OpenThrottle/monorepo',
      sha: 'deadbeef',
    }),
    sessionId: 'session-1',
    type: 'git_commit',
  };

  it('stamps producedAt on the create path so the non-nullable field never resolves to null', async () => {
    const artifact = await resolver.recordWorkArtifact(gitCommitInput);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        producedAt: expect.any(Date),
        sessionId: 'session-1',
        type: 'git_commit',
      }),
    );
    // The returned entity is what GraphQL serializes for the non-nullable
    // WorkArtifactObject.producedAt field — it must be a real Date, not null.
    expect(artifact.producedAt).toBeInstanceOf(Date);
  });

  it('promotes an existing idempotent artifact without regressing its producedAt', async () => {
    const existing = createMock<WorkArtifact>({
      id: 'artifact-existing',
      message: 'old message',
      producedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    repo.findOne.mockResolvedValue(existing);

    const artifact = await resolver.recordWorkArtifact(gitCommitInput);

    // Promote path reuses the loaded row (create is not called) and keeps its producedAt.
    expect(repo.create).not.toHaveBeenCalled();
    expect(artifact.producedAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
  });
});
