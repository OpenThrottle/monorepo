/**
 * @description Hook agents run through the driver engine: outcome classification, and the phase
 * runner's output streaming, timeout and `onFailure` handling for `beforeAll` and `afterEach`.
 */

import { describe, expect, it, vi } from 'vitest';

import { executeJobRunHooksPhase } from '../job-run-hooks-runner.ts';
import { parseJobRunHookEntry } from '../job-run-lifecycle-hooks-validation.ts';
import type { JobRunHookRunDriver } from '../runJobRunHookAgent.ts';
import { runJobRunHookAgent } from '../runJobRunHookAgent.ts';

const PLAN_ID = '00000000-0000-4000-8000-000000000001';
const SENTINEL = '<promise>ERROR</promise>';

const exitsWith = (output: string, code: number): JobRunHookRunDriver => {
  return vi.fn(async (_driver, _config, options) => {
    options.onExit?.(code);

    return output;
  });
};

const baseParams = {
  agentPrompt: 'run the hook',
  backend: 'claude',
  hookIndex: 0,
  model: undefined,
  timeoutMs: 1000,
} as const;

describe('runJobRunHookAgent', () => {
  it('runs the agent through the injected driver engine with the plan backend, model and timeout', async () => {
    const runDriver = exitsWith('all good', 0);
    const controller = new AbortController();

    const result = await runJobRunHookAgent({
      ...baseParams,
      hookIndex: 3,
      model: 'sonnet',
      runDriver,
      signal: controller.signal,
      timeoutMs: 7000,
    });

    expect(result).toEqual({ ok: true, output: 'all good' });

    const [driver, config] = vi.mocked(runDriver).mock.calls[0] ?? [];

    expect(driver?.id).toBe('claude');
    expect(config).toMatchObject({
      iteration: 3,
      model: 'sonnet',
      prompt: 'run the hook',
      signal: controller.signal,
      timeoutMs: 7000,
    });
  });

  it('treats a non-zero exit code as a failure and keeps the output', async () => {
    const result = await runJobRunHookAgent({
      ...baseParams,
      runDriver: exitsWith('partial work', 2),
    });

    expect(result).toEqual({
      errorMessage: 'agent CLI exited with code 2',
      ok: false,
      output: 'partial work',
    });
  });

  it('treats the engine timeout sentinel as a failure', async () => {
    const result = await runJobRunHookAgent({
      ...baseParams,
      runDriver: vi.fn(async () => {
        return `${SENTINEL}\nClaude Code iteration timed out after 1000ms`;
      }),
    });

    expect(result).toEqual({
      errorMessage: 'Claude Code iteration timed out after 1000ms',
      ok: false,
    });
  });

  it('reports a cancel, not a failure, when the signal aborted', async () => {
    const controller = new AbortController();
    const runDriver: JobRunHookRunDriver = vi.fn(async () => {
      controller.abort();

      return `${SENTINEL}\nClaude Code iteration was cancelled`;
    });

    const result = await runJobRunHookAgent({
      ...baseParams,
      runDriver,
      signal: controller.signal,
    });

    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('reports a rejected spawn as a failure', async () => {
    const result = await runJobRunHookAgent({
      ...baseParams,
      runDriver: vi.fn(async () => {
        throw new Error('spawn claude ENOENT');
      }),
    });

    expect(result).toEqual({ errorMessage: 'spawn claude ENOENT', ok: false });
  });

  it('surfaces a usage limit and an account error as failures', async () => {
    const limited: JobRunHookRunDriver = vi.fn(
      async (_driver, _config, options) => {
        options.onUsageLimit?.({
          rateLimitType: 'five_hour',
          resetsAt: '2026-11-22T12:00:00.000Z',
        });
        options.onExit?.(0);

        return 'limit reached';
      },
    );
    const noCredit: JobRunHookRunDriver = vi.fn(
      async (_driver, _config, options) => {
        options.onAccountError?.({
          apiKeySource: null,
          kind: 'billing_error',
          message: null,
        });
        options.onExit?.(0);

        return 'no credit';
      },
    );

    const limitedResult = await runJobRunHookAgent({
      ...baseParams,
      runDriver: limited,
    });
    const accountResult = await runJobRunHookAgent({
      ...baseParams,
      runDriver: noCredit,
    });

    expect(limitedResult.ok).toBe(false);
    expect(limitedResult.errorMessage).toContain('usage limit');
    expect(accountResult.ok).toBe(false);
    expect(accountResult.errorMessage).toContain('account error');
  });
});

describe('executeJobRunHooksPhase with the driver-backed hook agent', () => {
  const AFTER_EACH_TASK = {
    task: {
      category: undefined,
      id: 'task-1',
      status: 'COMPLETED',
      title: 'A task',
    },
    taskOutcome: 'completed',
  } as const;

  const run = (params: {
    readonly appended: string[];
    readonly entry: Record<string, unknown>;
    readonly phase: 'afterEach' | 'beforeAll';
    readonly runDriver: JobRunHookRunDriver;
  }) => {
    const isAfterEach = params.phase === 'afterEach';

    return executeJobRunHooksPhase({
      deps: {
        appendPlanOutput: async (content) => {
          params.appended.push(content);
        },
        cwd: process.cwd(),
        runHookAgent: ({ agentPrompt, hookIndex, signal, timeoutMs }) => {
          return runJobRunHookAgent({
            agentPrompt,
            backend: 'claude',
            hookIndex,
            model: undefined,
            runDriver: params.runDriver,
            signal,
            timeoutMs,
          });
        },
      },
      hooks: {
        hooks: [
          parseJobRunHookEntry({
            kind: 'prompt_profile',
            prompt: '/agents/hook',
            promptDelivery: 'named',
            ...params.entry,
            phase: params.phase,
          }),
        ],
      },
      layer1Suffix: 'suffix',
      phase: params.phase,
      planContextBlock: '--- plan ---',
      planId: PLAN_ID,
      runKind: 'orchestrator',
      ...(isAfterEach ? AFTER_EACH_TASK : {}),
    });
  };

  const timesOut: JobRunHookRunDriver = vi.fn(async () => {
    return `${SENTINEL}\nClaude Code iteration timed out after 7000ms`;
  });

  it('beforeAll: streams start, agent output and finish to plan output in order and passes the hook timeout', async () => {
    const appended: string[] = [];
    const runDriver = exitsWith('hook says hi', 0);

    const result = await run({
      appended,
      entry: { timeoutSeconds: 7 },
      phase: 'beforeAll',
      runDriver,
    });

    expect(result.blocked).toBe(false);
    expect(appended).toHaveLength(3);
    expect(appended[0]).toContain('[job-run-hook] Starting');
    expect(appended[1]).toBe('hook says hi\n');
    expect(appended[2]).toContain('[job-run-hook] Finished');
    expect(vi.mocked(runDriver).mock.calls[0]?.[1].timeoutMs).toBe(7000);
  });

  it('beforeAll: a timed-out hook blocks when onFailure is block', async () => {
    const appended: string[] = [];

    const result = await run({
      appended,
      entry: { onFailure: 'block', timeoutSeconds: 7 },
      phase: 'beforeAll',
      runDriver: timesOut,
    });

    expect(result.blocked).toBe(true);
    expect(result.results[0]).toMatchObject({ ok: false, onFailure: 'block' });
    expect(appended.at(-1)).toContain('failed');
    expect(appended.at(-1)).toContain('timed out after 7000ms');
    expect(appended.at(-1)).toContain('on_failure=block');
  });

  it('beforeAll: a failing hook does not block when onFailure is warn or ignore', async () => {
    const warned = await run({
      appended: [],
      entry: { onFailure: 'warn' },
      phase: 'beforeAll',
      runDriver: exitsWith('boom', 1),
    });
    const ignored = await run({
      appended: [],
      entry: { onFailure: 'ignore' },
      phase: 'beforeAll',
      runDriver: exitsWith('boom', 1),
    });

    expect(warned.blocked).toBe(false);
    expect(warned.results[0]?.ok).toBe(false);
    expect(ignored.blocked).toBe(false);
  });

  it('afterEach: streams output and never blocks, even on a timeout with onFailure block', async () => {
    const appended: string[] = [];

    const ok = await run({
      appended,
      entry: {},
      phase: 'afterEach',
      runDriver: exitsWith('summary', 0),
    });
    const failedAppended: string[] = [];
    const failed = await run({
      appended: failedAppended,
      entry: { onFailure: 'block', timeoutSeconds: 7 },
      phase: 'afterEach',
      runDriver: timesOut,
    });

    expect(ok.blocked).toBe(false);
    expect(appended[1]).toBe('summary\n');
    expect(failed.blocked).toBe(false);
    expect(failed.results[0]).toMatchObject({ ok: false, onFailure: 'block' });
    expect(failedAppended.at(-1)).toContain('timed out after 7000ms');
  });
});
