/**
 * @description Command-construction tests for the codex (`codex exec`) and grok (`grok -p`) drivers,
 * including model/prompt escaping, grok's permission-mode + `-w` worktree support, and codex's
 * lack of worktree flags. Verified flag shapes come from the installed CLIs' `--help`.
 */

import { describe, expect, it } from 'vitest';
import type { DriverInvocationConfig } from '../../types/index.ts';
import { codexDriver, getDriver, grokDriver } from '../index.ts';

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'> & {
    prompt?: string;
  } = {},
): DriverInvocationConfig => ({
  iteration: 1,
  prompt: extra.prompt ?? 'fix it',
  ...extra,
});

describe('codex driver', () => {
  it('builds the base exec command with a workspace-write sandbox', () => {
    expect(codexDriver.buildShellCommand(config())).toBe(
      'codex exec --sandbox workspace-write "fix it"',
    );
  });

  it('places --model before the positional prompt', () => {
    expect(codexDriver.buildShellCommand(config({ model: 'o3' }))).toBe(
      'codex exec --sandbox workspace-write --model o3 "fix it"',
    );
  });

  it('omits --model when unset or auto', () => {
    expect(codexDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      'codex exec --sandbox workspace-write "fix it"',
    );
  });

  it('neutralizes prompt metacharacters and escapes a malicious model', () => {
    expect(
      codexDriver.buildShellCommand(
        config({ model: 'm; rm -rf ~', prompt: 'run $(id)' }),
      ),
    ).toBe(
      'codex exec --sandbox workspace-write --model "m; rm -rf ~" "run \\$(id)"',
    );
  });

  it('ignores worktree options (no worktree capability)', () => {
    expect(
      codexDriver.buildShellCommand(config({ worktree: { worktree: 'wt' } })),
    ).toBe('codex exec --sandbox workspace-write "fix it"');
  });

  it('advertises id, label, and capabilities', () => {
    expect(codexDriver.id).toBe('codex');
    expect(codexDriver.label).toBe('codex');
    expect(codexDriver.capabilities).toEqual({
      chatStreaming: true,
      permissionMode: true,
      skipWorktreeSetup: false,
      supportsModelFlag: true,
      worktree: false,
      worktreeBase: false,
    });
  });

  it('is resolvable from the registry', () => {
    expect(getDriver('codex')).toBe(codexDriver);
  });
});

describe('grok driver', () => {
  it('builds the single-turn command with acceptEdits', () => {
    expect(grokDriver.buildShellCommand(config())).toBe(
      'grok -p "fix it" --permission-mode acceptEdits',
    );
  });

  it('appends --model when set (omits for auto)', () => {
    expect(grokDriver.buildShellCommand(config({ model: 'grok-4' }))).toBe(
      'grok -p "fix it" --permission-mode acceptEdits --model grok-4',
    );
    expect(grokDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      'grok -p "fix it" --permission-mode acceptEdits',
    );
  });

  it('appends -w for a named worktree', () => {
    expect(
      grokDriver.buildShellCommand(config({ worktree: { worktree: 'wt' } })),
    ).toBe('grok -p "fix it" --permission-mode acceptEdits -w wt');
  });

  it('appends bare -w for the flag-only worktree sentinel', () => {
    expect(
      grokDriver.buildShellCommand(config({ worktree: { worktree: '' } })),
    ).toBe('grok -p "fix it" --permission-mode acceptEdits -w');
  });

  it('does not emit --worktree-base (capability off; grok uses --worktree-ref)', () => {
    const command = grokDriver.buildShellCommand(
      config({ worktree: { worktree: 'wt', worktreeBase: 'main' } }),
    );
    expect(command).toBe(
      'grok -p "fix it" --permission-mode acceptEdits -w wt',
    );
    expect(command).not.toContain('--worktree-base');
  });

  it('neutralizes prompt metacharacters', () => {
    expect(
      grokDriver.buildShellCommand(config({ prompt: 'leak ${HOME}' })),
    ).toBe('grok -p "leak \\${HOME}" --permission-mode acceptEdits');
  });

  it('advertises id, label, and capabilities', () => {
    expect(grokDriver.id).toBe('grok');
    expect(grokDriver.label).toBe('grok');
    expect(grokDriver.capabilities).toEqual({
      chatStreaming: true,
      permissionMode: true,
      skipWorktreeSetup: false,
      supportsModelFlag: true,
      worktree: true,
      worktreeBase: false,
    });
  });

  it('is resolvable from the registry', () => {
    expect(getDriver('grok')).toBe(grokDriver);
  });
});
