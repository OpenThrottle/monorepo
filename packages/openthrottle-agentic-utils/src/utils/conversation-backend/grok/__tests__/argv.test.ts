import { describe, expect, it } from 'vitest';

import { buildGrokArgv } from '../argv.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
} from '../../types.ts';

/** The value after a flag, or undefined when the flag is absent. */
const valueAfter = (
  argv: readonly string[],
  flag: string,
): string | undefined =>
  argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined;

describe('buildGrokArgv', () => {
  it('builds a fresh headless streaming turn', () => {
    const argv = buildGrokArgv({ cwd: '/w', prompt: 'hello', resume: false });

    expect(argv).toEqual([
      '--single=hello',
      '--output-format',
      'streaming-json',
      '--cwd',
      '/w',
    ]);
  });

  it('passes the prompt as a `=`-attached value so a leading dash is inert', () => {
    const argv = buildGrokArgv({
      cwd: '/w',
      prompt: '--not-a-flag',
      resume: false,
    });
    expect(argv[0]).toBe('--single=--not-a-flag');
    // The prompt is a single argv element, never split.
    expect(argv.filter((a) => a.startsWith('--single='))).toHaveLength(1);
  });

  it('resumes with -r <sessionId>', () => {
    const argv = buildGrokArgv({
      cwd: '/w',
      prompt: 'again',
      resume: true,
      sessionId: 'ses-1',
    });
    expect(valueAfter(argv, '-r')).toBe('ses-1');
  });

  it('throws when resuming without a session id', () => {
    expect(() =>
      buildGrokArgv({ cwd: '/w', prompt: 'x', resume: true, sessionId: '' }),
    ).toThrow('requires a sessionId');
  });

  it('adds --model when provided, omits it for blank/auto', () => {
    expect(
      valueAfter(
        buildGrokArgv({
          cwd: '/w',
          model: 'grok-4.5-build',
          prompt: 'p',
          resume: false,
        }),
        '--model',
      ),
    ).toBe('grok-4.5-build');
    expect(
      buildGrokArgv({ cwd: '/w', model: 'auto', prompt: 'p', resume: false }),
    ).not.toContain('--model');
  });

  it('passes persona via a `=`-attached --system-prompt-override (frontmatter-safe)', () => {
    const argv = buildGrokArgv({
      cwd: '/w',
      prompt: 'p',
      resume: false,
      systemPrompt: '---\npersona: x\n---\nBe terse.',
    });
    expect(argv).toContain(
      '--system-prompt-override=---\npersona: x\n---\nBe terse.',
    );
  });

  describe('permission mode → --permission-mode', () => {
    it('fullAccess → bypassPermissions', () => {
      expect(
        valueAfter(
          buildGrokArgv({
            cwd: '/w',
            permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
            prompt: 'p',
            resume: false,
          }),
          '--permission-mode',
        ),
      ).toBe('bypassPermissions');
    });

    it('autoAcceptEdits → acceptEdits', () => {
      expect(
        valueAfter(
          buildGrokArgv({
            cwd: '/w',
            permissionMode: CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
            prompt: 'p',
            resume: false,
          }),
          '--permission-mode',
        ),
      ).toBe('acceptEdits');
    });

    it('no mode → omits --permission-mode (grok default)', () => {
      expect(
        buildGrokArgv({ cwd: '/w', prompt: 'p', resume: false }),
      ).not.toContain('--permission-mode');
    });
  });

  describe('reasoning effort → --reasoning-effort', () => {
    const effortFor = (
      reasoning: (typeof CONVERSATION_REASONING_EFFORTS)[keyof typeof CONVERSATION_REASONING_EFFORTS],
    ): string | undefined =>
      valueAfter(
        buildGrokArgv({ cwd: '/w', prompt: 'p', reasoning, resume: false }),
        '--reasoning-effort',
      );

    it('maps low/medium straight through', () => {
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.low)).toBe('low');
      expect(effortFor(CONVERSATION_REASONING_EFFORTS.medium)).toBe('medium');
    });

    it('clamps high/extraHigh/max/ultra to high', () => {
      for (const level of [
        CONVERSATION_REASONING_EFFORTS.high,
        CONVERSATION_REASONING_EFFORTS.extraHigh,
        CONVERSATION_REASONING_EFFORTS.max,
        CONVERSATION_REASONING_EFFORTS.ultra,
      ]) {
        expect(effortFor(level)).toBe('high');
      }
    });

    it('omits --reasoning-effort when no level is given', () => {
      expect(
        buildGrokArgv({ cwd: '/w', prompt: 'p', resume: false }),
      ).not.toContain('--reasoning-effort');
    });
  });
});
