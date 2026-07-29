import { describe, expect, it } from 'vitest';

import { buildOpencodeArgv } from '../argv.ts';
import { CONVERSATION_REASONING_EFFORTS } from '../../types.ts';

/** The value after a flag, or undefined when the flag is absent. */
const valueAfter = (
  argv: readonly string[],
  flag: string,
): string | undefined =>
  argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined;

describe('buildOpencodeArgv', () => {
  it('builds a first-turn run with no -s (opencode mints the session)', () => {
    const argv = buildOpencodeArgv({ cwd: '/repo', prompt: 'hello' });

    expect(argv).toEqual([
      'run',
      '--format',
      'json',
      '--dir',
      '/repo',
      '--',
      'hello',
    ]);
    expect(argv).not.toContain('-s');
  });

  it('resumes with -s and selects the model, prompt stays last after --', () => {
    const argv = buildOpencodeArgv({
      cwd: '/repo',
      model: 'opencode/nemotron-3-ultra-free',
      prompt: '---\npersona\n---\ndo it',
      sessionId: 'ses_123',
    });

    expect(argv[argv.indexOf('-s') + 1]).toBe('ses_123');
    expect(argv[argv.indexOf('-m') + 1]).toBe('opencode/nemotron-3-ultra-free');
    expect(argv.at(-2)).toBe('--');
    expect(argv.at(-1)).toBe('---\npersona\n---\ndo it');
  });

  it('omits -s and -m when blank', () => {
    const argv = buildOpencodeArgv({
      cwd: '/repo',
      model: '',
      prompt: 'hi',
      sessionId: '',
    });

    expect(argv).not.toContain('-s');
    expect(argv).not.toContain('-m');
  });

  describe('permission --auto', () => {
    it('emits --auto right after run when auto is true (fullAccess)', () => {
      const argv = buildOpencodeArgv({
        auto: true,
        cwd: '/repo',
        prompt: 'hi',
      });

      expect(argv[0]).toBe('run');
      expect(argv[1]).toBe('--auto');
      expect(argv.at(-1)).toBe('hi');
    });

    it('omits --auto for the default/scoped postures', () => {
      expect(
        buildOpencodeArgv({ auto: false, cwd: '/repo', prompt: 'hi' }),
      ).not.toContain('--auto');
      expect(buildOpencodeArgv({ cwd: '/repo', prompt: 'hi' })).not.toContain(
        '--auto',
      );
    });
  });

  describe('reasoning effort → --variant', () => {
    const variantFor = (
      reasoning: (typeof CONVERSATION_REASONING_EFFORTS)[keyof typeof CONVERSATION_REASONING_EFFORTS],
    ): string | undefined =>
      valueAfter(
        buildOpencodeArgv({ cwd: '/repo', prompt: 'hi', reasoning }),
        '--variant',
      );

    it('maps low/medium/high straight through', () => {
      expect(variantFor(CONVERSATION_REASONING_EFFORTS.low)).toBe('low');
      expect(variantFor(CONVERSATION_REASONING_EFFORTS.medium)).toBe('medium');
      expect(variantFor(CONVERSATION_REASONING_EFFORTS.high)).toBe('high');
    });

    it('maps extraHigh → high and (max, ultra) → max', () => {
      expect(variantFor(CONVERSATION_REASONING_EFFORTS.extraHigh)).toBe('high');
      expect(variantFor(CONVERSATION_REASONING_EFFORTS.max)).toBe('max');
      expect(variantFor(CONVERSATION_REASONING_EFFORTS.ultra)).toBe('max');
    });

    it('omits --variant when no reasoning level is given, prompt stays last', () => {
      const argv = buildOpencodeArgv({ cwd: '/repo', prompt: 'hi' });
      expect(argv).not.toContain('--variant');
      expect(argv.at(-1)).toBe('hi');
    });
  });
});
