import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  attachSessionSubjectToolHandler,
  beginTaskSessionToolHandler,
  beginTaskSessionToolParameters,
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

describe('begin_task_session', () => {
  beforeEach(() => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'test-token';
    delete process.env.OPENTHROTTLE_MCP_MODEL;
    clearCurrentSession();
    mockExecute.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    delete process.env.OPENTHROTTLE_MCP_MODEL;
    clearCurrentSession();
  });

  it('opens a session carrying the declared model and attaches it to the task', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({
        attachWorkSessionSubject: {
          id: 'subj-a',
          taskId: '22222222-2222-4222-8222-222222222222',
        },
      });

    const result = await beginTaskSessionToolHandler({
      model: 'claude-sonnet-5',
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });

    expect(expectStructured(result)).toMatchObject({
      model: 'claude-sonnet-5',
      sessionId: 'sess-a',
    });

    // The model must reach startWorkSession — that is the only moment it can be recorded.
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      'test-token',
      expect.anything(),
      {
        input: expect.objectContaining({ model: 'claude-sonnet-5' }),
      },
    );
    // ...and the subject must name the task, which is what makes the model per-task readable.
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      'test-token',
      expect.anything(),
      {
        input: {
          planId: '11111111-1111-4111-8111-111111111111',
          sessionId: 'sess-a',
          taskId: '22222222-2222-4222-8222-222222222222',
        },
      },
      { headers: { 'X-OT-Session-Id': 'sess-a' } },
    );
  });

  it('rotates the session so two tasks record two different models', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-a' } })
      .mockResolvedValueOnce({ endWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-b' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-b' } });

    await beginTaskSessionToolHandler({
      model: 'claude-sonnet-5',
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });
    const second = await beginTaskSessionToolHandler({
      model: 'claude-opus-5',
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '33333333-3333-4333-8333-333333333333',
    });

    expect(expectStructured(second)).toMatchObject({
      model: 'claude-opus-5',
      sessionId: 'sess-b',
    });

    // The previous session was closed before the new one opened — without that, the second
    // task's work would land on the first task's session and inherit its model.
    const [, , third, fourth] = mockExecute.mock.calls;
    expect(third?.[2]).toEqual({
      input: { sessionId: 'sess-a', summary: null },
    });
    expect(fourth?.[2]).toEqual({
      input: expect.objectContaining({ model: 'claude-opus-5' }),
    });
  });

  it('degrades a malformed model to no model instead of failing the call', () => {
    // Attribution must never be able to fail a tool call, so a non-string model is dropped
    // rather than rejected. Null is a legible answer; a failed task-start is not.
    //
    // Asserted on the schema rather than through the handler, because the schema IS the gate
    // that would otherwise reject the call: both dispatch paths (the MCP SDK's
    // validateToolInput and @rekog/mcp-nest's McpToolsHandler) safeParse against this exact
    // object before the handler runs. safeParse takes unknown, so a malformed value is
    // expressible here without a cast.
    const parsed = beginTaskSessionToolParameters.safeParse({
      model: 12345,
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.model).toBeNull();
    // Identity is NOT lenient in the same object — only attribution is.
    expect(parsed.data?.taskId).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('records an explicitly null model as no model', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-a' } });

    const result = await beginTaskSessionToolHandler({
      model: null,
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });

    expect(expectStructured(result)).toMatchObject({ model: null });
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      'test-token',
      expect.anything(),
      { input: expect.objectContaining({ model: null }) },
    );
  });

  it('records no model when none is declared and the launcher set none', async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-a' } });

    const result = await beginTaskSessionToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });

    expect(expectStructured(result)).toMatchObject({ model: null });
    expect(result.content[0]?.text).toContain('not observable');
  });

  it('falls back to the launcher model when the caller declares none', async () => {
    process.env.OPENTHROTTLE_MCP_MODEL = 'claude-opus-5';
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-a' } });

    const result = await beginTaskSessionToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });

    expect(expectStructured(result)).toMatchObject({ model: 'claude-opus-5' });
  });

  it("still opens this task's session when closing the previous one fails", async () => {
    mockExecute
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-a' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-a' } })
      .mockRejectedValueOnce(new Error('end failed'))
      .mockResolvedValueOnce({ startWorkSession: { id: 'sess-b' } })
      .mockResolvedValueOnce({ attachWorkSessionSubject: { id: 'subj-b' } });

    await beginTaskSessionToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '22222222-2222-4222-8222-222222222222',
    });
    const second = await beginTaskSessionToolHandler({
      model: 'claude-sonnet-5',
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: '33333333-3333-4333-8333-333333333333',
    });

    // A stale row the sweeper will close is strictly better than refusing to start the task,
    // and better than reusing sess-a and misattributing task B to task A's model.
    expect(expectStructured(second)).toMatchObject({ sessionId: 'sess-b' });
  });

  it('gives concurrent rotations distinct sessions, not one shared model', async () => {
    // Regression: dispatched concurrently (which MCP permits — the stdio server processes
    // queued requests in parallel), both calls previously observed "nothing open yet", adopted
    // the SAME in-flight lazy open, and landed on one session carrying one model — while each
    // caller was told its own model had been recorded. Reporting a provenance value that is not
    // the stored one is worse than recording none, so rotation must serialize.
    let started = 0;
    mockExecute.mockImplementation((_token, document) => {
      const operation = JSON.stringify(document);
      if (operation.includes('StartWorkSession')) {
        started += 1;
        return Promise.resolve({ startWorkSession: { id: `sess-${started}` } });
      }
      if (operation.includes('EndWorkSession')) {
        return Promise.resolve({ endWorkSession: { id: 'ended' } });
      }
      return Promise.resolve({ attachWorkSessionSubject: { id: 'subj' } });
    });

    const [first, second] = await Promise.all([
      beginTaskSessionToolHandler({
        model: 'claude-sonnet-5',
        planId: '11111111-1111-4111-8111-111111111111',
        taskId: '22222222-2222-4222-8222-222222222222',
      }),
      beginTaskSessionToolHandler({
        model: 'claude-opus-5',
        planId: '11111111-1111-4111-8111-111111111111',
        taskId: '33333333-3333-4333-8333-333333333333',
      }),
    ]);

    const firstSession = expectStructured(first).sessionId;
    const secondSession = expectStructured(second).sessionId;

    expect(firstSession).not.toBe(secondSession);
    expect(started).toBe(2);

    // Each session must carry the model its own caller declared.
    const models = new Map(
      mockExecute.mock.calls
        .filter(([, document]) =>
          JSON.stringify(document).includes('StartWorkSession'),
        )
        .map(([, , variables], index) => [
          `sess-${index + 1}`,
          JSON.stringify(variables),
        ]),
    );
    expect(models.get(firstSession)).toContain(
      expectStructured(first).model ?? '',
    );
    expect(models.get(secondSession)).toContain(
      expectStructured(second).model ?? '',
    );
  });

  it('rejects a non-uuid taskId without opening a session', async () => {
    const result = await beginTaskSessionToolHandler({
      planId: '11111111-1111-4111-8111-111111111111',
      taskId: 'not-a-uuid',
    });

    // Identity is strict where attribution is lenient: attaching work to the wrong task is
    // worse than recording no model.
    expect(result).toMatchObject({ isError: true });
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
