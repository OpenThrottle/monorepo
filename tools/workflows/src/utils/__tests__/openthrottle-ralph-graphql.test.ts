/**
 * @description Tests for GraphQL transport helpers in openthrottle-ralph-graphql.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AttachWorkSessionSubjectDocument,
  EndWorkSessionDocument,
  GetPlanDocument,
  RecordWorkArtifactDocument,
  StartWorkSessionDocument,
} from '@openthrottle/openthrottle-agentic-ralph';

const executeWorkflowGraphqlV2Mock = vi.hoisted(() => vi.fn());

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
    executeWorkflowGraphqlV2Mock.mockResolvedValue({
      serverHealth: {
        api: 'ok',
        database: 'unreachable',
        redis: 'ok',
        websocket: 'ok',
      },
    });

    const { ensureGraphqlIsReachable: ensureGraphqlIsReachable } =
      await import('../openthrottle-ralph-graphql.js');

    await expect(ensureGraphqlIsReachable()).rejects.toThrow(
      /database is unreachable/,
    );
  });

  it('updatePlanStatusGraphql returns null when plan is already IN_PROGRESS', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === GetPlanDocument) {
        return { plan: { ...planRow, status: 'IN_PROGRESS' } };
      }

      return {};
    });

    const { updatePlanStatusGraphql } =
      await import('../openthrottle-ralph-graphql.js');

    const row = await updatePlanStatusGraphql('plan-1', 'IN_PROGRESS');

    expect(row).toBeNull();
    expect(executeWorkflowGraphqlV2Mock).toHaveBeenCalledTimes(1);
  });

  it('insertCommitLinkGraphql orchestrates the generic ledger primitives (no linkCommit)', async () => {
    executeWorkflowGraphqlV2Mock.mockImplementation(async (document) => {
      if (document === StartWorkSessionDocument) {
        return { startWorkSession: { id: 'session-1' } };
      }
      if (document === AttachWorkSessionSubjectDocument) {
        return { attachWorkSessionSubject: { id: 'subject-1' } };
      }
      if (document === RecordWorkArtifactDocument) {
        return {
          recordWorkArtifact: {
            createdAt: '2026-07-19T00:00:00.000Z',
            id: 'artifact-1',
            message: 'PR title',
          },
        };
      }
      if (document === EndWorkSessionDocument) {
        return { endWorkSession: { id: 'session-1' } };
      }
      return {};
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
      StartWorkSessionDocument,
      AttachWorkSessionSubjectDocument,
      RecordWorkArtifactDocument,
      EndWorkSessionDocument,
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
});
