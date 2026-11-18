import { createMock } from '@golevelup/ts-vitest';
import type {
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSession,
  WorkSessionsRepository,
  WorkSessionSubject,
  WorkSessionSubjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  WorkArtifactsRepositoryMock,
  WorkSessionsRepositoryMock,
  WorkSessionSubjectsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createWorkArtifactsRepositoryMock,
  createWorkSessionsRepositoryMock,
  createWorkSessionSubjectsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WorkLedgerResolver } from './work-ledger.resolver.ts';

interface ResolverHarness {
  readonly artifacts: WorkArtifactsRepositoryMock;
  readonly resolver: WorkLedgerResolver;
  readonly sessions: WorkSessionsRepositoryMock;
  readonly subjects: WorkSessionSubjectsRepositoryMock;
}

/**
 * @description A resolver over the package mocks. `create` echoes its input as the saved row and
 * deliberately does NOT synthesize any DB default (`produced_at`, `started_at DEFAULT now()`), so
 * a create path that omits one surfaces as undefined — the regression these tests guard against.
 */
const buildResolver = (): ResolverHarness => {
  const artifacts = createWorkArtifactsRepositoryMock();
  const sessions = createWorkSessionsRepositoryMock();
  const subjects = createWorkSessionSubjectsRepositoryMock();

  artifacts.create.mockImplementation(async (input) => {
    return createMock<WorkArtifact>({ ...input, id: 'artifact-new' });
  });
  artifacts.update.mockImplementation(async (id, input) => {
    return createMock<WorkArtifact>({ ...input, id });
  });
  sessions.create.mockImplementation(async (input) => {
    return createMock<WorkSession>({ ...input, id: 'session-new' });
  });
  subjects.createMany.mockImplementation(async (inputs) => {
    return inputs.map((input) => {
      return createMock<WorkSessionSubject>({ ...input });
    });
  });

  return {
    artifacts,
    resolver: new WorkLedgerResolver(
      createMock<WorkArtifactsRepository>(artifacts),
      createMock<WorkSessionsRepository>(sessions),
      createMock<WorkSessionSubjectsRepository>(subjects),
    ),
    sessions,
    subjects,
  };
};

describe('WorkLedgerResolver.recordWorkArtifact', () => {
  let harness: ResolverHarness;

  beforeEach(() => {
    harness = buildResolver();
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
    const artifact = await harness.resolver.recordWorkArtifact(gitCommitInput);

    expect(harness.artifacts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        producedAt: expect.any(Date),
        sessionId: 'session-1',
        type: 'git_commit',
        verification: 'unverified',
      }),
    );
    // The returned entity is what GraphQL serializes for the non-nullable
    // WorkArtifactObject.producedAt field — it must be a real Date, not null.
    expect(artifact.producedAt).toBeInstanceOf(Date);
  });

  it('promotes an existing idempotent artifact without touching its producedAt', async () => {
    const existing = createMock<WorkArtifact>({
      id: 'artifact-existing',
      message: 'old message',
      producedAt: new Date('2026-02-01T00:00:00.000Z'),
      sessionId: 'session-1',
    });
    harness.artifacts.findOne.mockResolvedValue(existing);
    harness.artifacts.update.mockResolvedValue(existing);

    await harness.resolver.recordWorkArtifact(gitCommitInput);

    // The promote path updates the loaded row (create is not called) and writes only
    // payload and message, never producedAt, lifecycle or verification.
    expect(harness.artifacts.create).not.toHaveBeenCalled();
    expect(harness.artifacts.update).toHaveBeenCalledWith('artifact-existing', {
      message: 'feat: thing (#1)',
      payload: { repo: 'OpenThrottle/monorepo', sha: 'deadbeef' },
    });
  });
});

describe('WorkLedgerResolver.startWorkSession', () => {
  let harness: ResolverHarness;

  beforeEach(() => {
    harness = buildResolver();
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
    const session = await harness.resolver.startWorkSession(
      input,
      'user-1',
      'user',
    );

    expect(harness.sessions.create).toHaveBeenCalledWith(
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

describe('WorkLedgerResolver.endWorkSession', () => {
  let harness: ResolverHarness;

  beforeEach(() => {
    harness = buildResolver();
  });

  it('closes the session explicitly, carrying the summary', async () => {
    await harness.resolver.endWorkSession({
      sessionId: 'session-1',
      summary: 'done',
    });

    expect(harness.sessions.close).toHaveBeenCalledWith('session-1', {
      closedBy: 'explicit',
      endedAt: expect.any(Date),
      summary: 'done',
    });
  });

  it('returns null when the session does not exist', async () => {
    await expect(
      harness.resolver.endWorkSession({ sessionId: 'missing', summary: null }),
    ).resolves.toBeNull();
  });
});

describe('WorkLedgerResolver.workLedgerCompleteness', () => {
  let harness: ResolverHarness;

  beforeEach(() => {
    harness = buildResolver();
  });

  const row = (planId: string, recorded: boolean) => {
    return {
      artifactCount: 1,
      planId,
      planStatus: 'COMPLETED',
      planTitle: planId,
      recorded,
    };
  };

  it('counts a plan as recorded only when the verifier confirmed a landed commit', async () => {
    // The SQL orders unrecorded first; mirror that here.
    harness.artifacts.listPlanCompleteness.mockResolvedValue([
      row('owed-1', false),
      row('owed-2', false),
      row('recorded-1', true),
    ]);

    const result = await harness.resolver.workLedgerCompleteness({
      limit: null,
    });

    expect(result.totalCount).toBe(3);
    expect(result.recordedCount).toBe(1);
    expect(result.owedCount).toBe(2);
    expect(result.owed.map((plan) => plan.planId)).toEqual([
      'owed-1',
      'owed-2',
    ]);
  });

  it('truncates the owed list but never the counts', async () => {
    harness.artifacts.listPlanCompleteness.mockResolvedValue([
      row('owed-1', false),
      row('owed-2', false),
      row('owed-3', false),
      row('recorded-1', true),
    ]);

    const result = await harness.resolver.workLedgerCompleteness({ limit: 1 });

    // A caller paging the list must still see the true size of the backlog.
    expect(result.owed).toHaveLength(1);
    expect(result.owedCount).toBe(3);
    expect(result.totalCount).toBe(4);
  });

  it('reports a fully-recorded ledger as complete', async () => {
    harness.artifacts.listPlanCompleteness.mockResolvedValue([
      row('recorded-1', true),
      row('recorded-2', true),
    ]);

    const result = await harness.resolver.workLedgerCompleteness({
      limit: null,
    });

    expect(result.owed).toEqual([]);
    expect(result.owedCount).toBe(0);
    expect(result.recordedCount).toBe(result.totalCount);
  });
});

describe('WorkLedgerResolver.recordWorkArtifact across sessions', () => {
  // uq_work_artifacts_type_external_key is global for idempotent types, so the same
  // commit reported by a second session must resolve to the one existing row rather
  // than attempt an insert the index would reject.
  let harness: ResolverHarness;

  beforeEach(() => {
    harness = buildResolver();
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

  const subject = (planId: string, sessionId: string): WorkSessionSubject => {
    return createMock<WorkSessionSubject>({ planId, sessionId, taskId: null });
  };

  it('looks the artifact up globally, not scoped to the reporting session', async () => {
    await harness.resolver.recordWorkArtifact(input);

    // A sessionId in the where clause would miss another session's row and then
    // fail the insert against the global unique index.
    expect(harness.artifacts.findOne).toHaveBeenCalledWith({
      where: {
        externalKey: 'github:OpenThrottle/monorepo@deadbeef',
        type: 'git_commit',
      },
    });
  });

  it("carries the reporting session's subjects onto the artifact it found", async () => {
    harness.artifacts.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ id: 'artifact-a', sessionId: 'session-a' }),
    );
    harness.subjects.findBy.mockImplementation(async (options) => {
      const where = options?.where;
      const isSessionB =
        where != null &&
        !Array.isArray(where) &&
        where.sessionId === 'session-b';

      return isSessionB
        ? [subject('plan-2', 'session-b')]
        : [subject('plan-1', 'session-a')];
    });

    await harness.resolver.recordWorkArtifact(input);

    // Otherwise plan-2 silently loses its link to this commit — the same
    // (commit, plan) pair loss migration 118 exists to undo.
    expect(harness.subjects.createMany).toHaveBeenCalledWith([
      {
        attachedAt: expect.any(Date),
        planId: 'plan-2',
        sessionId: 'session-a',
        taskId: null,
      },
    ]);
  });

  it('attaches nothing when the subject is already on the artifact session', async () => {
    harness.artifacts.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ id: 'artifact-a', sessionId: 'session-a' }),
    );
    harness.subjects.findBy.mockResolvedValue([subject('plan-1', 'either')]);

    await harness.resolver.recordWorkArtifact(input);

    expect(harness.subjects.createMany).not.toHaveBeenCalled();
  });

  it('does not mirror when the same session re-reports its own artifact', async () => {
    harness.artifacts.findOne.mockResolvedValue(
      createMock<WorkArtifact>({ id: 'artifact-b', sessionId: 'session-b' }),
    );

    await harness.resolver.recordWorkArtifact(input);

    expect(harness.subjects.findBy).not.toHaveBeenCalled();
    expect(harness.subjects.createMany).not.toHaveBeenCalled();
  });
});
