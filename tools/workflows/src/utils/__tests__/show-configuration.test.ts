import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RalphArgs } from '../parsers';
import { showConfiguration } from '../index';

const baseArgs = (): RalphArgs => ({
  backend: 'cursor',
  iterationTimeoutMs: undefined,
  iterations: 1,
  model: undefined,
  plan: '80864bba-630a-451d-bfd2-4b25ec202381',
  project: undefined,
  prompt: '/agents/ralph',
  promptProfileKind: 'named',
  promptProfileLabel: '/agents/ralph',
  ralphDebugLevel: 'off',
  skipWorktreeSetup: undefined,
  task: undefined,
  taskIterations: undefined,
  worktree: undefined,
  worktreeBase: undefined,
});

describe('showConfiguration', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs process cwd as working directory', () => {
    showConfiguration(baseArgs());

    const cwdLine = logSpy.mock.calls
      .map((call: readonly unknown[]) => String(call[0]))
      .find((line: string) => line.includes('working directory:'));

    expect(cwdLine).toContain(process.cwd());
    expect(cwdLine).toContain('process cwd');
  });

  it('logs agent CLI worktree when set', () => {
    showConfiguration({ ...baseArgs(), worktree: 'my-wt' });

    const worktreeLine = logSpy.mock.calls
      .map((call: readonly unknown[]) => String(call[0]))
      .find(
        (line: string) =>
          line.includes('worktree:') && line.includes('agent CLI'),
      );

    expect(worktreeLine).toContain('my-wt');
  });
});
