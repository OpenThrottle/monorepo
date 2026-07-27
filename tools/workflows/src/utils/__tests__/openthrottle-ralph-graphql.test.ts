/**
 * @description Tests for GraphQL transport helpers in openthrottle-ralph-graphql.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RalphAttachWorkSessionSubjectDocument,
  RalphEndWorkSessionDocument,
  GetPlanDocument,
  RalphRecordWorkArtifactDocument,
  RalphStartWorkSessionDocument,
  ReadPlanRunCancelMarkerDocument,
  RecordPlanRunHeartbeatDocument,
  RegisterCliPlanRunDocument,
  SettleCliPlanRunDocument,
  WorkflowGraphqlError,
} from '@openthrottle/openthrottle-agentic-ralph';

const executeWorkflowGraphqlV2Mock = vi.hoisted(() => vi.fn());

/**
 * @description Wraps mock data in a successful {@link GraphqlV2Result} envelope, matching the
 * non-throwing shape `executeWorkflowGraphqlV2` now returns.
 */
const ok = <TData>(data: TData): { data: TData; ok: true } => ({
  data,
  ok: true,
});

vi.mock('@openthrottle/openthrottle-agentic-ralph', async () => {
  const actual = await vi.importActual<
    typeof import('@openthrottle/openthrottle-agentic-ralph')
  >('@openthrottle/openthrottle-agentic-ralph');

  return {
    ...actual,
    executeWorkflowGraphqlV2: executeWorkflowGraphqlV2Mock,
  };
});

const planRow = {
  author: 'visormatt',
  category: 'infra',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  id: 'plan-1',
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('openthrottle-ralph-graphql', () => {
  beforeEach(() => {
    executeWorkflowGraphqlV2Mock.mockReset();
  });

  it('ensureGraphqlIsReachable throws when database is unreachable', async () => {
    executeWorkflowGraphqlV2Mock.mockResolvedValue(
      ok({
        serverHealth: {
          api: 'ok',
          database: 'unreachable',
          redis: 'ok',
          websocket: 'ok',
        },
      }),
    );

    const { ensureGraphqlIsReachable: ensureGraphqlIsReachable } =
      await import('../openthrottle-ralph-graphql.js');

    await expect(ensureGraphqlIsReachable()).rejects.toThrow(
      /database is unreachable/,
    );
  });

  it('ensureGraphqlIsReachable classifies a transport failure via the structured GraphqlV2Failure', async () => {
    executeWorkflowGraphqlV2Mock.mockResolvedValue({
      error: {
        cause: undefined,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: undefined,
        kind: 'network',
        message: 'fetch failed',
      },
      ok: false,
    });

    const { ensureGraphqlIsReachable } =
      await import('../openthrottle-ralph-graphql.js');

    await expect(ensureGraphqlIsReachable()).rejects.toBeInstanceOf(
      WorkflowGraphqlError,
    );

    executeWorkflowGraphqlV2Mock.mockResolvedValue({
      error: {
        cause: undefined,
        graphqlErrors: undefined,
        graphqlPath: undefined,
        httpStatus: undefined,
        kind: 'network',
        message: 'fetch failed',
      },
      ok: false,
    });

    await expect(ensureGraphqlIsReachable()).rejects.toThrow(/unreachable/);
  });

  it('updatePlanStatusGraphql returns null when plan is already IN_PROGRESS', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === GetPlanDocument) {
        return ok({ plan: { ...planRow, status: 'IN_PROGRESS' } });
      }

      return ok({});
    });

    const { updatePlanStatusGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    const row = await updatePlanStatusGraphql('plan-1', 'IN_PROGRESS');

    expect(row).toBeNull();
    expect(executeWorkflowGraphqlV2Mock).toHaveBeenCalledTimes(1);
  });

  it('insertCommitLinkGraphql orchestrates the generic ledger primitives (no linkCommit)', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === RalphStartWorkSessionDocument) {
        return ok({ startWorkSession: { id: 'session-1' } });
      }
      if (document === RalphAttachWorkSessionSubjectDocument) {
        return ok({ attachWorkSessionSubject: { id: 'subject-1' } });
      }
      if (document === RalphRecordWorkArtifactDocument) {
        return ok({
          recordWorkArtifact: {
            createdAt: '2026-07-19T00:00:00.000Z',
            id: 'artifact-1',
            message: 'PR title',
          },
        });
      }
      if (document === RalphEndWorkSessionDocument) {
        return ok({ endWorkSession: { id: 'session-1' } });
      }
      return ok({});
    });

    const { insertCommitLinkGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    const row = await insertCommitLinkGraphql({
      message: 'PR title',
      planId: 'plan-1',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
      taskId: 'task-1',
    });

    // Artifact identity flows back as the CommitLinkRow id; the (repo, sha) are echoed from input.
    expect(row).toEqual({
      createdAt: '2026-07-19T00:00:00.000Z',
      id: 'artifact-1',
      message: 'PR title',
      planId: 'plan-1',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
      taskId: 'task-1',
    });

    // Ordered orchestration: start → attach subject → record git_commit → end.
    const documents = executeWorkflowGraphqlV2Mock.mock.calls.map(
      (call) => call[0],
    );
    expect(documents).toEqual([
      RalphStartWorkSessionDocument,
      RalphAttachWorkSessionSubjectDocument,
      RalphRecordWorkArtifactDocument,
      RalphEndWorkSessionDocument,
    ]);

    const [, attachVars] = executeWorkflowGraphqlV2Mock.mock.calls[1] ?? [];
    expect(attachVars).toEqual({
      input: { planId: 'plan-1', sessionId: 'session-1', taskId: 'task-1' },
    });

    const [, recordVars] = executeWorkflowGraphqlV2Mock.mock.calls[2] ?? [];
    expect(recordVars.input.type).toBe('git_commit');
    expect(recordVars.input.sessionId).toBe('session-1');
    expect(JSON.parse(recordVars.input.payloadJson)).toEqual({
      landedSha: 'abc123',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
    });
  });

  it('registerCliPlanRunGraphql sends location + backend and returns the new run id', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === RegisterCliPlanRunDocument) {
        return ok({ registerCliPlanRun: { id: 'cli-run-1' } });
      }
      return ok({});
    });

    const { registerCliPlanRunGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    const planRunId = await registerCliPlanRunGraphql({
      executionBackend: 'claude',
      location: { hostname: 'laptop-1', pid: 4242, workerId: 'cli-abc' },
      planId: 'plan-1',
    });

    expect(planRunId).toBe('cli-run-1');
    const [document, vars] = executeWorkflowGraphqlV2Mock.mock.calls[0] ?? [];
    expect(document).toBe(RegisterCliPlanRunDocument);
    expect(vars).toEqual({
      input: {
        executionBackend: 'claude',
        hostname: 'laptop-1',
        pid: 4242,
        planId: 'plan-1',
        workerId: 'cli-abc',
      },
    });
  });

  it('readPlanRunCancelMarkerGraphql returns the newest run marker', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === ReadPlanRunCancelMarkerDocument) {
        return ok({
          planRunsByPlanId: [
            {
              cancelRequestedAt: '2026-07-22T00:05:00.000Z',
              createdAt: '2026-07-22T00:00:00.000Z',
              id: 'cli-run-2',
              status: 'IN_PROGRESS',
            },
          ],
        });
      }
      return ok({});
    });

    const { readPlanRunCancelMarkerGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    const marker = await readPlanRunCancelMarkerGraphql('plan-1');

    expect(marker).toEqual({
      cancelRequestedAt: '2026-07-22T00:05:00.000Z',
      planRunId: 'cli-run-2',
      status: 'IN_PROGRESS',
    });
    const [, vars] = executeWorkflowGraphqlV2Mock.mock.calls[0] ?? [];
    expect(vars).toEqual({ input: { limit: 1, planId: 'plan-1' } });
  });

  it('readPlanRunCancelMarkerGraphql returns null when the plan has no run row', async () => {
    executeWorkflowGraphqlV2Mock.mockResolvedValue(
      ok({ planRunsByPlanId: [] }),
    );

    const { readPlanRunCancelMarkerGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    expect(await readPlanRunCancelMarkerGraphql('plan-1')).toBeNull();
  });

  it('settleCliPlanRunGraphql calls the settle mutation with run id + status', async () => {
    executeWorkflowGraphqlV2Mock.mockResolvedValue(
      ok({ settleCliPlanRun: { id: 'cli-run-1', status: 'CANCELLED' } }),
    );

    const { settleCliPlanRunGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    await settleCliPlanRunGraphql('cli-run-1', 'CANCELLED');

    const [document, vars] = executeWorkflowGraphqlV2Mock.mock.calls[0] ?? [];
    expect(document).toBe(SettleCliPlanRunDocument);
    expect(vars).toEqual({
      input: { planRunId: 'cli-run-1', status: 'CANCELLED' },
    });
  });

  it('bumpCliPlanRunHeartbeatGraphql calls the heartbeat mutation with the run id', async () => {
    executeWorkflowGraphqlV2Mock.mockResolvedValue(
      ok({
        recordPlanRunHeartbeat: {
          id: 'cli-run-1',
          lastHeartbeatAt: '2026-07-22T00:10:00.000Z',
          status: 'IN_PROGRESS',
        },
      }),
    );

    const { bumpCliPlanRunHeartbeatGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    await bumpCliPlanRunHeartbeatGraphql('cli-run-1');

    const [document, vars] = executeWorkflowGraphqlV2Mock.mock.calls[0] ?? [];
    expect(document).toBe(RecordPlanRunHeartbeatDocument);
    expect(vars).toEqual({ input: { planRunId: 'cli-run-1' } });
  });
});
