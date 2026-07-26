import { describe, expect, it } from 'vitest';

import { buildOpencodeArgv } from '../argv.ts';

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
});
