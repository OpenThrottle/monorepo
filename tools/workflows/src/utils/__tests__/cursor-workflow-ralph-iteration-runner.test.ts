/**
 * @description Tests for {@link createCursorWorkflowRalphIterationRunner} wiring to {@link runIterationAsync}.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CursorAgentChunk } from '../../bin/run-iteration';

const runIterationAsyncMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue('combined'),
);

vi.mock('../../bin/run-iteration', () => ({
  runIteration: vi.fn(),
  runIterationAsync: (...args: unknown[]) => runIterationAsyncMock(...args),
}));

describe('createCursorWorkflowRalphIterationRunner', () => {
  beforeEach(() => {
    runIterationAsyncMock.mockClear();
    runIterationAsyncMock.mockResolvedValue('combined');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps iteration params onto runIterationAsync', async () => {
    const { createCursorWorkflowRalphIterationRunner } =
      await import('../cursor-workflow-ralph-iteration-runner.ts');

    const runner = createCursorWorkflowRalphIterationRunner();
    const signal = new AbortController().signal;

    await runner.run({
      agentPrompt: 'prompt',
      iteration: 3,
      model: 'auto',
      runner: 'cursor',
      signal,
      timeoutMs: 120_000,
    });

    expect(runIterationAsyncMock).toHaveBeenCalledTimes(1);
    expect(runIterationAsyncMock).toHaveBeenCalledWith({
      agentPrompt: 'prompt',
      backend: 'cursor',
      iteration: 3,
      model: 'auto',
      onChunk: undefined,
      signal,
      timeoutMs: 120_000,
    });
  });

  it('merges factory and per-run onUsageLimit hooks into one callback', async () => {
    const { createCursorWorkflowRalphIterationRunner } =
      await import('../cursor-workflow-ralph-iteration-runner.ts');

    const factoryHook = vi.fn();
    const runHook = vi.fn();
    const runner = createCursorWorkflowRalphIterationRunner({
      onUsageLimit: factoryHook,
    });

    await runner.run({
      agentPrompt: 'p',
      iteration: 1,
      model: undefined,
      onUsageLimit: runHook,
      runner: 'claude',
      signal: undefined,
      timeoutMs: undefined,
    });

    const call = runIterationAsyncMock.mock.calls[0]?.[0];
    const limit = { rateLimitType: 'five_hour', resetsAt: null };
    call.onUsageLimit(limit);

    expect(factoryHook).toHaveBeenCalledExactlyOnceWith(limit);
    expect(runHook).toHaveBeenCalledExactlyOnceWith(limit);
  });

  it('passes no onUsageLimit when neither hook is set', async () => {
    const { createCursorWorkflowRalphIterationRunner } =
      await import('../cursor-workflow-ralph-iteration-runner.ts');

    await createCursorWorkflowRalphIterationRunner().run({
      agentPrompt: 'p',
      iteration: 1,
      model: undefined,
      runner: 'claude',
      signal: undefined,
      timeoutMs: undefined,
    });

    expect(
      runIterationAsyncMock.mock.calls[0]?.[0].onUsageLimit,
    ).toBeUndefined();
  });

  it('maps runner claude to runIterationAsync backend claude', async () => {
    const { createCursorWorkflowRalphIterationRunner } =
      await import('../cursor-workflow-ralph-iteration-runner.ts');

    const runner = createCursorWorkflowRalphIterationRunner();

    await runner.run({
      agentPrompt: 'p',
      iteration: 1,
      model: 'sonnet',
      runner: 'claude',
      signal: undefined,
      timeoutMs: 60_000,
    });

    expect(runIterationAsyncMock).toHaveBeenCalledWith({
      agentPrompt: 'p',
      backend: 'claude',
      iteration: 1,
      model: 'sonnet',
      onChunk: undefined,
      signal: undefined,
      timeoutMs: 60_000,
    });
  });

  it('merges onChunk and appendPlanOutput into a single runIterationAsync onChunk', async () => {
    const { createCursorWorkflowRalphIterationRunner } =
      await import('../cursor-workflow-ralph-iteration-runner.ts');

    const onChunk = vi.fn();
    const appendPlanOutput = vi.fn();

    let capturedOnChunk: ((chunk: CursorAgentChunk) => void) | undefined;

    runIterationAsyncMock.mockImplementation(
      async (config: { onChunk?: (c: CursorAgentChunk) => void }) => {
        capturedOnChunk = config.onChunk;
        return 'out';
      },
    );

    const runner = createCursorWorkflowRalphIterationRunner({
      appendPlanOutput,
      onChunk,
    });

    await runner.run({
      agentPrompt: 'p',
      iteration: 2,
      model: undefined,
      runner: 'cursor',
      signal: undefined,
      timeoutMs: undefined,
    });

    expect(capturedOnChunk).toBeTypeOf('function');
    const chunk: CursorAgentChunk = { data: 'x', stream: 'stdout' };
    capturedOnChunk?.(chunk);

    expect(onChunk).toHaveBeenCalledWith(chunk);
    expect(appendPlanOutput).toHaveBeenCalledWith({
      iteration: 2,
      stream: 'stdout',
      text: 'x',
    });
  });

  it('merges params.onChunk from run() without factory onChunk', async () => {
    const { createCursorWorkflowRalphIterationRunner } =
      await import('../cursor-workflow-ralph-iteration-runner.ts');

    const paramsOnChunk = vi.fn();

    let capturedOnChunk: ((chunk: CursorAgentChunk) => void) | undefined;

    runIterationAsyncMock.mockImplementation(
      async (config: { onChunk?: (c: CursorAgentChunk) => void }) => {
        capturedOnChunk = config.onChunk;
        return 'out';
      },
    );

    const runner = createCursorWorkflowRalphIterationRunner();

    await runner.run({
      agentPrompt: 'p',
      iteration: 1,
      model: undefined,
      onChunk: paramsOnChunk,
      runner: 'cursor',
      signal: undefined,
      timeoutMs: undefined,
    });

    expect(capturedOnChunk).toBeTypeOf('function');
    const chunk: CursorAgentChunk = { data: 'y', stream: 'stderr' };
    capturedOnChunk?.(chunk);

    expect(paramsOnChunk).toHaveBeenCalledWith({
      data: 'y',
      stream: 'stderr',
    });
  });
});
