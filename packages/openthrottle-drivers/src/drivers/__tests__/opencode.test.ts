/**
 * @description Command-construction tests for the OpenCode driver (`opencode run --auto …`),
 * including prompt/model escaping and confirmation that it advertises no worktree capability.
 */

import { describe, expect, it } from 'vitest';
import type { DriverInvocationConfig } from '../../types/index.ts';
import { getDriver } from '../index.ts';
import { opencodeDriver } from '../opencode.ts';

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'> & {
    prompt?: string;
  } = {},
): DriverInvocationConfig => ({
  iteration: 1,
  prompt: extra.prompt ?? 'do the thing',
  ...extra,
});

describe('opencode driver', () => {
  it('builds the base run command with --auto', () => {
    expect(opencodeDriver.buildShellCommand(config())).toBe(
      'opencode run --auto "do the thing"',
    );
  });

  it('appends --model for a provider/model value', () => {
    expect(
      opencodeDriver.buildShellCommand(config({ model: 'anthropic/claude' })),
    ).toBe('opencode run --auto "do the thing" --model anthropic/claude');
  });

  it('omits --model when unset or auto', () => {
    expect(opencodeDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      'opencode run --auto "do the thing"',
    );
    expect(opencodeDriver.buildShellCommand(config({ model: '  ' }))).toBe(
      'opencode run --auto "do the thing"',
    );
  });

  it('neutralizes shell metacharacters in the prompt', () => {
    expect(
      opencodeDriver.buildShellCommand(
        config({ prompt: 'leak ${HOME} $(id)' }),
      ),
    ).toBe('opencode run --auto "leak \\${HOME} \\$(id)"');
  });

  it('escapes a malicious model value', () => {
    expect(
      opencodeDriver.buildShellCommand(config({ model: 'x; rm -rf ~' })),
    ).toBe('opencode run --auto "do the thing" --model "x; rm -rf ~"');
  });

  it('ignores worktree options (no worktree capability)', () => {
    expect(
      opencodeDriver.buildShellCommand(
        config({
          worktree: {
            skipWorktreeSetup: true,
            worktree: 'wt',
            worktreeBase: 'main',
          },
        }),
      ),
    ).toBe('opencode run --auto "do the thing"');
  });

  it('advertises id, label, and capabilities', () => {
    expect(opencodeDriver.id).toBe('opencode');
    expect(opencodeDriver.label).toBe('opencode');
    expect(opencodeDriver.capabilities).toEqual({
      permissionMode: true,
      skipWorktreeSetup: false,
      supportsModelFlag: true,
      worktree: false,
      worktreeBase: false,
    });
  });

  it('is resolvable from the registry', () => {
    expect(getDriver('opencode')).toBe(opencodeDriver);
  });
});
