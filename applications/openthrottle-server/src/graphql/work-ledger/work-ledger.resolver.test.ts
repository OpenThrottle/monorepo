import { createMock } from '@golevelup/ts-vitest';
import type {
  WorkArtifact,
  WorkLedgerService,
  WorkSession,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkLedgerResolver } from './work-ledger.resolver.ts';

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

describe('WorkLedgerResolver.startWorkSession', () => {
  // Same shape as the artifact repo above, and for the same reason: it deliberately does
  // NOT synthesize the `started_at DEFAULT now()` DB default, so a create path that omits
  // startedAt surfaces as undefined — which is the bug this guards against.
  const repo = {
    create: vi.fn((data: Record<string, unknown>) => data),
    save: vi.fn((entity: WorkSession) => Promise.resolve(entity)),
  };

  let workLedgerService: WorkLedgerService;
  let resolver: WorkLedgerResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    workLedgerService = createMock<WorkLedgerService>({
      getSessionRepository: vi.fn().mockReturnValue(repo),
    });
    resolver = new WorkLedgerResolver(workLedgerService);
  });

  const input = {
    conversationId: null,
    externalRef: 'openthrottle-mcp:123',
    model: null,
    onBehalfOfUserId: null,
    planRunId: null,
    toolName: 'claude-code',
    toolVersion: '1.0.0',
  };

  it('stamps startedAt on the create path so the non-nullable field never resolves to null', async () => {
    const session = await resolver.startWorkSession(input, 'user-1', 'user');

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        startedAt: expect.any(Date),
        toolName: 'claude-code',
      }),
    );
    // The returned entity is what GraphQL serializes for the non-nullable
    // WorkSessionObject.startedAt field — it must be a real Date, not null.
    // Selecting `id` alone used to work while selecting `startedAt` errored.
    expect(session.startedAt).toBeInstanceOf(Date);
  });
});

describe('WorkLedgerResolver.workLedgerCompleteness', () => {
  const query = vi.fn();
  const repo = { manager: { query } };

  let resolver: WorkLedgerResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new WorkLedgerResolver(
      createMock<WorkLedgerService>({
        getArtifactRepository: vi.fn().mockReturnValue(repo),
      }),
    );
  });

  const row = (planId: string, recorded: boolean) => ({
    artifactCount: 1,
    planId,
    planStatus: 'COMPLETED',
    planTitle: planId,
    recorded,
  });

  it('counts a plan as recorded only when the verifier confirmed a landed commit', async () => {
    // The SQL orders unrecorded first; mirror that here.
    query.mockResolvedValue([
      row('owed-1', false),
      row('owed-2', false),
      row('recorded-1', true),
    ]);

    const result = await resolver.workLedgerCompleteness({ limit: null });

    expect(result.totalCount).toBe(3);
    expect(result.recordedCount).toBe(1);
    expect(result.owedCount).toBe(2);
    expect(result.owed.map((plan) => plan.planId)).toEqual([
      'owed-1',
      'owed-2',
    ]);
  });

  it('truncates the owed list but never the counts', async () => {
    query.mockResolvedValue([
      row('owed-1', false),
      row('owed-2', false),
      row('owed-3', false),
      row('recorded-1', true),
    ]);

    const result = await resolver.workLedgerCompleteness({ limit: 1 });

    // A caller paging the list must still see the true size of the backlog.
    expect(result.owed).toHaveLength(1);
    expect(result.owedCount).toBe(3);
    expect(result.totalCount).toBe(4);
  });

  it('reports a fully-recorded ledger as complete', async () => {
    query.mockResolvedValue([row('recorded-1', true), row('recorded-2', true)]);

    const result = await resolver.workLedgerCompleteness({ limit: null });

    expect(result.owed).toEqual([]);
    expect(result.owedCount).toBe(0);
    expect(result.recordedCount).toBe(result.totalCount);
  });
});

describe('WorkLedgerResolver.recordWorkArtifact across sessions', () => {
  // uq_work_artifacts_type_external_key is global for idempotent types, so the same
  // commit reported by a second session must resolve to the one existing row rather
  // than attempt an insert the index would reject.
  const artifactRepo = {
    create: vi.fn((data: Record<string, unknown>) => data),
    findOne: vi.fn(),
    save: vi.fn((entity: WorkArtifact) => Promise.resolve(entity)),
  };
  const subjectRepo = {
    create: vi.fn((data: Record<string, unknown>) => data),
    find: vi.fn(),
    save: vi.fn((rows: unknown) => Promise.resolve(rows)),
  };

  let resolver: WorkLedgerResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    subjectRepo.find.mockResolvedValue([]);
    resolver = new WorkLedgerResolver(
      createMock<WorkLedgerService>({
        getArtifactRepository: vi.fn().mockReturnValue(artifactRepo),
        getSubjectRepository: vi.fn().mockReturnValue(subjectRepo),
      }),
    );
  });

  const input = {
    message: null,
    payloadJson: JSON.stringify({
      repo: 'OpenThrottle/monorepo',
      sha: 'deadbeef',
    }),
    sessionId: 'session-b',
    type: 'git_commit',
  };

  it('looks the artifact up globally, not scoped to the reporting session', async () => {
    artifactRepo.findOne.mockResolvedValue(null);

    await resolver.recordWorkArtifact(input);

    // A sessionId in the where clause would miss another session's row and then
    // fail the insert against the global unique index.
    expect(artifactRepo.findOne).toHaveBeenCalledWith({
      where: {
        externalKey: 'github:OpenThrottle/monorepo@deadbeef',
        type: 'git_commit',
      },
    });
  });

  it("carries the reporting session's subjects onto the artifact it found", async () => {
    artifactRepo.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ id: 'artifact-a', sessionId: 'session-a' }),
    );
    subjectRepo.find.mockImplementation(
      async ({ where }: { where: { sessionId: string } }) =>
        where.sessionId === 'session-b'
          ? [{ planId: 'plan-2', sessionId: 'session-b', taskId: null }]
          : [{ planId: 'plan-1', sessionId: 'session-a', taskId: null }],
    );

    await resolver.recordWorkArtifact(input);

    // Otherwise plan-2 silently loses its link to this commit — the same
    // (commit, plan) pair loss migration 118 exists to undo.
    expect(subjectRepo.save).toHaveBeenCalledWith([
      { planId: 'plan-2', sessionId: 'session-a', taskId: null },
    ]);
  });

  it('attaches nothing when the subject is already on the artifact session', async () => {
    artifactRepo.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ id: 'artifact-a', sessionId: 'session-a' }),
    );
    subjectRepo.find.mockResolvedValue([
      { planId: 'plan-1', sessionId: 'either', taskId: null },
    ]);

    await resolver.recordWorkArtifact(input);

    expect(subjectRepo.save).not.toHaveBeenCalled();
  });

  it('does not mirror when the same session re-reports its own artifact', async () => {
    artifactRepo.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ id: 'artifact-b', sessionId: 'session-b' }),
    );

    await resolver.recordWorkArtifact(input);

    expect(subjectRepo.find).not.toHaveBeenCalled();
    expect(subjectRepo.save).not.toHaveBeenCalled();
  });
});
