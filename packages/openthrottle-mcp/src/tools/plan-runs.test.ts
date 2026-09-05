import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  getPlanRunsToolHandler,
  registerPlanRunToolHandler,
  registerPlanRunWorktreeCheckoutToolHandler,
  settlePlanRunToolHandler,
} from './plan-runs.ts';
import {
  captureStdioExecutionBackend,
  detectExecutionBackendFromEnv,
  resolveExecutionBackend,
} from '../config/execution-backend.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const PLAN_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';

/**
 * @description Narrows a tool result to its success arm, failing the test if the handler errored.
 */
function expectStructured<T extends Record<string, unknown>>(
  result: { content: unknown[]; isError: true } | { structuredContent: T },
): T {
  if ('isError' in result) {
    throw new Error('expected a successful tool result, got an error result');
  }
  return result.structuredContent;
}

/**
 * @description The first text block of a tool result. Narrowed at runtime rather than
 * asserted, so a shape change fails loudly here instead of silently passing.
 */
function expectText(result: unknown): string {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('content' in result) ||
    !Array.isArray(result.content)
  ) {
    throw new Error('expected a tool result with content');
  }

  const [first] = result.content;
  if (
    typeof first !== 'object' ||
    first === null ||
    !('text' in first) ||
    typeof first.text !== 'string'
  ) {
    throw new Error('expected the first content block to carry text');
  }

  return first.text;
}

/** @description The GraphQL variables of the Nth mocked execute call. */
function expectVariables(callIndex: number): Record<string, unknown> {
  const variables = mockExecute.mock.calls[callIndex]?.[2];
  if (typeof variables !== 'object' || variables === null) {
    throw new Error(`no GraphQL variables recorded for call ${callIndex}`);
  }

  return { ...variables };
}

/** @description The `input` object of the Nth mocked execute call. */
function expectInput(callIndex: number): Record<string, unknown> {
  const { input } = expectVariables(callIndex);
  if (typeof input !== 'object' || input === null) {
    throw new Error(`call ${callIndex} carried no input object`);
  }

  return { ...input };
}

const planRunRow = (overrides: Record<string, unknown> = {}) => ({
  branch: 'feat/thing',
  bullmqJobId: null,
  cancelRequestedAt: null,
  createdAt: '2026-09-05T00:00:00.000Z',
  executionBackend: 'claude',
  heartbeatExpected: false,
  id: RUN_ID,
  isStale: false,
  lastHeartbeatAt: null,
  model: 'claude-opus-5',
  planId: PLAN_ID,
  queueName: 'plans',
  runKind: 'orchestrator',
  status: 'IN_PROGRESS',
  updatedAt: '2026-09-05T00:00:00.000Z',
  ...overrides,
});

describe('execution-backend detection', () => {
  afterEach(() => {
    captureStdioExecutionBackend(null);
  });

  it('detects the launching harness from its environment marker', () => {
    expect(detectExecutionBackendFromEnv({ CLAUDECODE: '1' })).toBe('claude');
    expect(detectExecutionBackendFromEnv({ CURSOR_AGENT: '1' })).toBe('cursor');
    expect(detectExecutionBackendFromEnv({ CODEX_SANDBOX: 'seatbelt' })).toBe(
      'codex',
    );
  });

  it('treats a blank marker as absent rather than present', () => {
    expect(detectExecutionBackendFromEnv({ CLAUDECODE: '   ' })).toBeNull();
  });

  it('returns null when nothing matches, which is a legitimate answer', () => {
    expect(detectExecutionBackendFromEnv({ PATH: '/usr/bin' })).toBeNull();
  });

  it('never lets a declared value override a detected one', () => {
    // The whole point of detecting. An agent running under cursor-agent that declares
    // "claude" does not produce a slightly-wrong row — it produces one nothing
    // downstream can tell is wrong, in the exact column review exists to read.
    captureStdioExecutionBackend('cursor');

    expect(resolveExecutionBackend('claude')).toBe('cursor');
  });

  it('falls back to the declared value only when detection found nothing', () => {
    // This is the HTTP surface's path: it captures nothing, because there the
    // environment describes the server rather than the caller.
    captureStdioExecutionBackend(null);

    expect(resolveExecutionBackend('codex')).toBe('codex');
    expect(resolveExecutionBackend('  ')).toBeNull();
    expect(resolveExecutionBackend(null)).toBeNull();
  });
});

describe('plan-run tools', () => {
  beforeEach(() => {
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'test-token';
    mockExecute.mockReset();
    captureStdioExecutionBackend('claude');
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    captureStdioExecutionBackend(null);
  });

  it('register_plan_run always opts out of heartbeat-based liveness', async () => {
    // Not configurable on purpose: a true here would put an agent turn back in the
    // stale sweep, which resets the plan and its IN_PROGRESS tasks to PENDING under
    // live work. This is the difference between telemetry and data loss.
    mockExecute.mockResolvedValueOnce({ registerCliPlanRun: planRunRow() });

    await registerPlanRunToolHandler({
      branch: 'feat/thing',
      model: 'claude-opus-5',
      planId: PLAN_ID,
    });

    expect(mockExecute).toHaveBeenCalledWith('test-token', expect.anything(), {
      input: expect.objectContaining({
        branch: 'feat/thing',
        executionBackend: 'claude',
        heartbeatExpected: false,
        model: 'claude-opus-5',
        planId: PLAN_ID,
      }),
    });
  });

  it('register_plan_run defaults hostname and pid from this process', async () => {
    // The agent does not reliably know either and would guess.
    mockExecute.mockResolvedValueOnce({ registerCliPlanRun: planRunRow() });

    await registerPlanRunToolHandler({ planId: PLAN_ID });

    const input = expectInput(0);
    expect(typeof input.hostname).toBe('string');
    expect(input.pid).toBe(process.pid);
  });

  it('register_plan_run stores null for an omitted model rather than guessing', async () => {
    mockExecute.mockResolvedValueOnce({ registerCliPlanRun: planRunRow() });

    await registerPlanRunToolHandler({ planId: PLAN_ID });

    expect(mockExecute).toHaveBeenCalledWith('test-token', expect.anything(), {
      input: expect.objectContaining({ branch: null, model: null }),
    });
  });

  it('register_plan_run leads with the run id, which the agent must carry', async () => {
    mockExecute.mockResolvedValueOnce({ registerCliPlanRun: planRunRow() });

    const result = await registerPlanRunToolHandler({ planId: PLAN_ID });

    expect(expectStructured(result).run).toMatchObject({ id: RUN_ID });
    expect(expectText(result)).toContain(`Run id: ${RUN_ID}`);
  });

  it('register_plan_run fails clearly when no backend can be determined', async () => {
    captureStdioExecutionBackend(null);

    const result = await registerPlanRunToolHandler({ planId: PLAN_ID });

    expect(result).toMatchObject({ isError: true });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('settle_plan_run treats an already-settled or unknown run as a no-op', async () => {
    // The loop and the Stop-hook backstop can both try to settle the same run, and
    // neither should get an error it will retry in a loop.
    mockExecute.mockResolvedValueOnce({ settleCliPlanRun: null });

    const result = await settlePlanRunToolHandler({
      planRunId: RUN_ID,
      status: 'COMPLETED',
    });

    expect(expectStructured(result).run).toBeNull();
    expect(result).not.toMatchObject({ isError: true });
  });

  it('settle_plan_run passes the status through for the server to validate', async () => {
    // Deliberately not re-validated here: two copies of the same rule drift apart.
    mockExecute.mockResolvedValueOnce({
      settleCliPlanRun: planRunRow({ status: 'COMPLETED' }),
    });

    await settlePlanRunToolHandler({ planRunId: RUN_ID, status: 'completed' });

    expect(mockExecute).toHaveBeenCalledWith('test-token', expect.anything(), {
      input: { planRunId: RUN_ID, status: 'completed' },
    });
  });

  it('register_plan_run_worktree_checkout names a soft failure as a soft failure', async () => {
    mockExecute.mockResolvedValueOnce({
      registerPlanRunWorktreeCheckout: { ...planRunRow(), checkout: null },
    });

    const result = await registerPlanRunWorktreeCheckoutToolHandler({
      filesystemPath: '/tmp/not-a-worktree',
      planRunId: RUN_ID,
    });

    expect(expectText(result)).toContain('no checkout linked');
  });

  it('get_plan_runs surfaces a pending cancel prominently', async () => {
    // Polling this is the ONLY way a Kill reaches an interactive run: the server
    // deliberately cannot stop one, so a cancel buried in JSON is a cancel missed.
    mockExecute.mockResolvedValueOnce({
      planRunsByPlanId: [
        planRunRow({ cancelRequestedAt: '2026-09-05T01:00:00.000Z' }),
      ],
    });

    const result = await getPlanRunsToolHandler({ planId: PLAN_ID });

    expect(expectText(result)).toContain('Cancel requested');
    expect(expectText(result)).toContain(RUN_ID);
  });

  it('get_plan_runs says nothing about cancellation when none is pending', async () => {
    mockExecute.mockResolvedValueOnce({ planRunsByPlanId: [planRunRow()] });

    const result = await getPlanRunsToolHandler({ planId: PLAN_ID });

    expect(expectText(result)).not.toContain('Cancel requested');
  });

  it('get_plan_runs leaves the limit clamp to the server', async () => {
    mockExecute.mockResolvedValueOnce({ planRunsByPlanId: [] });

    await getPlanRunsToolHandler({ limit: 9999, planId: PLAN_ID });

    expect(mockExecute).toHaveBeenCalledWith('test-token', expect.anything(), {
      input: { limit: 9999, planId: PLAN_ID },
    });
  });
});
