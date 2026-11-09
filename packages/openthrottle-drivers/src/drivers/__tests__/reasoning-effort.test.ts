/**
 * @description Reasoning-effort threading through each driver's `buildShellCommand`: the flag
 * appears (and clamps) for claude, codex, grok and opencode, and is silently ignored by cursor,
 * gemini and antigravity — whose commands must stay byte-identical with and without an effort.
 */

import { describe, expect, it } from 'vitest';

import type { DriverInvocationConfig } from '../../types/index.ts';
import {
  claudeEffortFlag,
  codexReasoningEffort,
  DRIVER_REASONING_EFFORTS,
  grokReasoningEffort,
  opencodeVariant,
} from '../../utils/reasoning-effort.ts';
import {
  antigravityDriver,
  claudeDriver,
  codexDriver,
  cursorDriver,
  geminiDriver,
  grokDriver,
  opencodeDriver,
} from '../index.ts';

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'> = {},
): DriverInvocationConfig => {
  return { iteration: 1, prompt: 'fix it', ...extra };
};

describe('driver reasoning effort', () => {
  it('claude emits --effort after --model, mapping extraHigh → xhigh and ultra → max', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({ effort: DRIVER_REASONING_EFFORTS.extraHigh, model: 'opus' }),
      ),
    ).toBe(
      'claude -p --permission-mode acceptEdits "fix it" --output-format stream-json --verbose --model opus --effort xhigh',
    );
    expect(
      claudeDriver.buildShellCommand(
        config({ effort: DRIVER_REASONING_EFFORTS.ultra }),
      ),
    ).toContain(' --effort max');
  });

  it('claude puts --effort before the worktree flag and emits nothing when omitted', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({
          effort: DRIVER_REASONING_EFFORTS.low,
          worktree: { worktree: 'wt' },
        }),
      ),
    ).toMatch(/ --effort low -w wt$/);
    expect(claudeDriver.buildShellCommand(config())).not.toContain('--effort');
  });

  it('codex emits -c model_reasoning_effort= before the prompt, clamping max to high', () => {
    expect(
      codexDriver.buildShellCommand(
        config({ effort: DRIVER_REASONING_EFFORTS.max, model: 'o3' }),
      ),
    ).toBe(
      'codex exec --sandbox workspace-write --skip-git-repo-check -c model_reasoning_effort=high --model o3 "fix it"',
    );
    expect(
      codexDriver.buildShellCommand(
        config({ effort: DRIVER_REASONING_EFFORTS.medium }),
      ),
    ).toBe(
      'codex exec --sandbox workspace-write --skip-git-repo-check -c model_reasoning_effort=medium "fix it"',
    );
    expect(codexDriver.buildShellCommand(config())).toBe(
      'codex exec --sandbox workspace-write --skip-git-repo-check "fix it"',
    );
  });

  it('grok emits --reasoning-effort, clamping extraHigh to high', () => {
    expect(
      grokDriver.buildShellCommand(
        config({ effort: DRIVER_REASONING_EFFORTS.extraHigh }),
      ),
    ).toBe(
      'grok -p "fix it" --permission-mode acceptEdits --reasoning-effort high',
    );
  });

  it('opencode emits --variant, mapping ultra to max', () => {
    expect(
      opencodeDriver.buildShellCommand(
        config({ effort: DRIVER_REASONING_EFFORTS.ultra }),
      ),
    ).toBe('opencode run --auto "fix it" --variant max');
  });

  it('cursor ignores effort: its command is unchanged', () => {
    const withoutEffort = cursorDriver.buildShellCommand(
      config({ model: 'auto', worktree: { worktree: 'wt' } }),
    );
    for (const effort of Object.values(DRIVER_REASONING_EFFORTS)) {
      expect(
        cursorDriver.buildShellCommand(
          config({ effort, model: 'auto', worktree: { worktree: 'wt' } }),
        ),
      ).toBe(withoutEffort);
    }
    expect(withoutEffort).not.toMatch(/effort|variant|reasoning/);
  });

  it('gemini and antigravity ignore effort', () => {
    for (const driver of [geminiDriver, antigravityDriver]) {
      expect(
        driver.buildShellCommand(
          config({ effort: DRIVER_REASONING_EFFORTS.high }),
        ),
      ).toBe(driver.buildShellCommand(config()));
    }
  });

  it('each mapper returns undefined for an omitted level', () => {
    expect(claudeEffortFlag(undefined)).toBeUndefined();
    expect(codexReasoningEffort(undefined)).toBeUndefined();
    expect(grokReasoningEffort(undefined)).toBeUndefined();
    expect(opencodeVariant(undefined)).toBeUndefined();
  });
});
