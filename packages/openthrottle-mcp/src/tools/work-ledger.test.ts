import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  attachSessionSubjectToolHandler,
  endSessionToolHandler,
  getWorkSessionsToolHandler,
  recordArtifactToolHandler,
} from './work-ledger.ts';
import { clearCurrentSession } from '../session/current-session.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

/**
 * @description Narrows a tool result to its success arm, failing the test if the handler errored.
 * `structuredContent` only exists on that arm, so asserting on it needs the narrow first.
 */
function expectStructured<T extends Record<string, unknown>>(
  result: { content: unknown[]; isError: true } | { structuredContent: T },
): T {
  if ('isError' in result) {
    throw new Error('expected a successful tool result, got an error result');
  }
  return result.structuredContent;
}

describe('work-ledger tools', () => {
  beforeEach(() => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'test-token';
    clearCurrentSession();
    mockExecute.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    clearCurrentSession();
  });

  it('record_artifact opens a session then records, sending X-OT-Session-Id', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } })
      .mockResolvedValueOnce({
        recordWorkArtifact: { externalKey: 'github:o/r@abc', id: 'art-1' },
      });

    const result = await recordArtifactToolHandler({
      payloadJson: JSON.stringify({ repo: 'o/r', sha: 'abc' }),
      type: 'git_commit',
    });

    expect(result).toMatchObject({
      structuredContent: { artifact: expect.objectContaining({ id: 'art-1' }) },
    });
    // First call opened the session; second recorded with the session header.
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenLastCalledWith(
      'test-token',
      expect.anything(),
      {
        input: expect.objectContaining({
          sessionId: 'sess-1',
          type: 'git_commit',
        }),
      },
      { headers: { 'X-OT-Session-Id': 'sess-1' } },
    );
  });

  it('record_artifact reuses the open session on a second call', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } })
      .mockResolvedValue({ recordWorkArtifact: { id: 'art-x' } });

    await recordArtifactToolHandler({
      payloadJson: '{"url":"a"}',
      type: 'document',
    });
    await recordArtifactToolHandler({
      payloadJson: '{"url":"b"}',
      type: 'document',
    });

    // 1 open + 2 records; the session is not reopened.
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('record_artifact rejects invalid args without calling GraphQL', async () => {
    const result = await recordArtifactToolHandler({
      payloadJson: '',
      type: 'git_commit',
    });

    expect(result).toMatchObject({ isError: true });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('attach_session_subject opens a session and attaches the plan', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-2' } })
      .mockResolvedValueOnce({
        attachWorkSessionSubject: { id: 'subj-1', planId: 'plan-1' },
      });

    const result = await attachSessionSubjectToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toMatchObject({
      structuredContent: { subject: expect.objectContaining({ id: 'subj-1' }) },
    });
  });

  it('end_session is a no-op when no session is active', async () => {
    const result = await endSessionToolHandler({});

    expect(result).toMatchObject({ structuredContent: { session: null } });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("get_work_sessions returns the plan's sessions, newest first", async () => {
    mockExecute.mockResolvedValueOnce({
      workSessionsByPlan: {
        sessions: [
          { id: 'sess-2', model: 'claude-opus-5', toolName: 'claude-code' },
          { id: 'sess-1', model: null, toolName: 'openthrottle-mcp' },
        ],
        totalCount: 2,
      },
    });

    const result = await getWorkSessionsToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toMatchObject({
      structuredContent: {
        sessions: [
          expect.objectContaining({ id: 'sess-2' }),
          expect.objectContaining({ id: 'sess-1' }),
        ],
        totalCount: 2,
      },
    });
    // A read must not open a work session of its own.
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('get_work_sessions caps the rows it returns while reporting the true total', async () => {
    mockExecute.mockResolvedValueOnce({
      workSessionsByPlan: {
        sessions: Array.from({ length: 40 }, (_unused, index) => ({
          id: `sess-${index}`,
        })),
        totalCount: 40,
      },
    });

    const result = await getWorkSessionsToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
    });

    const structured = expectStructured(result);
    expect(structured.sessions).toHaveLength(25);
    expect(structured.totalCount).toBe(40);
    expect(result.content[0]?.text).toContain('showing 25 most recent');
  });

  it('get_work_sessions clamps an oversized limit', async () => {
    mockExecute.mockResolvedValueOnce({
      workSessionsByPlan: {
        sessions: Array.from({ length: 200 }, (_unused, index) => ({
          id: `sess-${index}`,
        })),
        totalCount: 200,
      },
    });

    const result = await getWorkSessionsToolHandler({
      limit: 1000,
      planId: '11111111-1111-4111-8111-111111111111',
    });

    expect(expectStructured(result).sessions).toHaveLength(100);
  });

  it('get_work_sessions rejects a non-uuid planId without calling GraphQL', async () => {
    const result = await getWorkSessionsToolHandler({ planId: 'not-a-uuid' });

    expect(result).toMatchObject({ isError: true });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
