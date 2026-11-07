import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseResegmentArgs } from '../resegment-args.ts';

const parse = (argv: string[], env: Record<string, string> = {}) => {
  return parseResegmentArgs({ argv, cwd: '/work/repo', env });
};

describe('parseResegmentArgs', () => {
  it('requires --session', () => {
    expect(parse([])).toEqual({
      error: '--session is required at least once',
      kind: 'error',
    });
  });

  it('reads repeated --session and --dry-run', () => {
    const parsed = parse([
      '--dry-run',
      '--session',
      'sess-a',
      '--session=sess-b',
      '--projects-dir',
      '/tmp/p',
      '--repo-root=/r',
      '--timeout-ms',
      '500',
    ]);
    expect(parsed).toEqual({
      kind: 'options',
      options: {
        dryRun: true,
        projectsDir: '/tmp/p',
        repoRoot: '/r',
        sessionIds: ['sess-a', 'sess-b'],
        timeoutMs: 500,
      },
    });
  });

  it('defaults projects dir and repo root', () => {
    const parsed = parse(['--session', 's1'], {
      CLAUDE_PROJECT_DIR: '/from/env',
    });
    expect(parsed.kind).toBe('options');
    if (parsed.kind !== 'options') {
      return;
    }
    expect(parsed.options.repoRoot).toBe('/from/env');
    expect(parsed.options.projectsDir).toBe(
      path.join(process.env.HOME ?? '', '.claude', 'projects'),
    );
    expect(parsed.options.dryRun).toBe(false);
  });

  it('answers --help', () => {
    expect(parse(['--help'])).toEqual({ kind: 'help' });
  });

  it.each([
    [['--nope'], 'unknown argument: --nope'],
    [['--session'], '--session needs a value'],
    [
      ['--session', 's1', '--timeout-ms', '0'],
      '--timeout-ms must be a positive integer: 0',
    ],
  ])('rejects %j', (argv, message) => {
    expect(parse(argv)).toEqual({ error: message, kind: 'error' });
  });
});
