/**
 * @description Integration tests for `--effort` in {@link parseRalphArgs}
 * (uses a partial mock of the runtime seed merge).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ralph-runtime-config', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../ralph-runtime-config.ts')>();
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

describe('parseRalphArgs (--effort)', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    delete process.env.WORKFLOW_RALPH_DEBUG;
    delete process.env.RALPH_DEBUG;
    delete process.env.WORKFLOW_RALPH_VERBOSE;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('defaults effort to undefined when the flag is absent', async () => {
    process.argv = ['node', 'ralph.js', '--task', TASK_UUID];
    const { parseRalphArgs } = await import('../parsers.ts');
    expect(parseRalphArgs().effort).toBeUndefined();
  });

  it.each(['low', 'medium', 'high', 'extraHigh', 'max', 'ultra'])(
    'accepts --effort %s',
    async (level) => {
      process.argv = [
        'node',
        'ralph.js',
        '--task',
        TASK_UUID,
        '--effort',
        level,
      ];
      const { parseRalphArgs } = await import('../parsers.ts');
      expect(parseRalphArgs().effort).toBe(level);
    },
  );

  it('throws on an unknown --effort value', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--task',
      TASK_UUID,
      '--effort',
      'turbo',
    ];
    const { parseRalphArgs } = await import('../parsers.ts');
    expect(() => parseRalphArgs()).toThrow(/--effort must be one of/);
  });

  it('throws when --effort has no value', async () => {
    process.argv = ['node', 'ralph.js', '--task', TASK_UUID, '--effort'];
    const { parseRalphArgs } = await import('../parsers.ts');
    expect(() => parseRalphArgs()).toThrow(/--effort/);
  });
});
