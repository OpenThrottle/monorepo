/**
 * @description Integration tests for `--task-iterations` in {@link parseRalphArgs}
 * (uses a partial mock of the runtime seed merge).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ralph-runtime-config', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../ralph-runtime-config')>();
  return {
    ...actual,
    mergeRalphRuntimeSeed: vi.fn(() => ({
      backend: 'cursor',
      iterationTimeoutMs: undefined,
      iterations: 10,
      model: 'auto',
      project: undefined,
      prompt: '/agents/ralph',
      promptFile: undefined,
      skipWorktreeSetup: undefined,
      taskIterations: undefined,
      worktree: undefined,
      worktreeBase: undefined,
    })),
  };
});

const TASK_UUID = '45a30762-92a9-42f4-90e0-2437c7ef26a8';

describe('parseRalphArgs (--task-iterations)', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    delete process.env.WORKFLOW_RALPH_DEBUG;
    delete process.env.RALPH_DEBUG;
    delete process.env.WORKFLOW_RALPH_VERBOSE;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('defaults taskIterations to undefined when the flag is absent', async () => {
    process.argv = ['node', 'ralph.js', '--task', TASK_UUID];
    const { parseRalphArgs } = await import('../parsers');
    expect(parseRalphArgs().taskIterations).toBeUndefined();
  });

  it('parses --task-iterations <n>', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--task',
      TASK_UUID,
      '--task-iterations',
      '5',
    ];
    const { parseRalphArgs } = await import('../parsers');
    expect(parseRalphArgs().taskIterations).toBe(5);
  });

  it('throws on a non-positive --task-iterations value', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--task',
      TASK_UUID,
      '--task-iterations',
      '0',
    ];
    const { parseRalphArgs } = await import('../parsers');
    expect(() => parseRalphArgs()).toThrow(/--task-iterations/);
  });
});
