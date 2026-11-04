import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseBackfillArgs } from '../backfill-args.ts';
import { DEFAULT_BACKFILL_SINCE } from '../transcript-backfill.ts';

const NOW = new Date('2026-10-29T12:00:00.000Z');

const parse = (argv: string[], env: Record<string, string> = {}) =>
  parseBackfillArgs({ argv, cwd: '/work/repo', env, now: NOW });

describe('parseBackfillArgs', () => {
  it('defaults to the dead-capture window ending now, sending for real', () => {
    const parsed = parse([]);
    expect(parsed.kind).toBe('options');
    if (parsed.kind !== 'options') {
      return;
    }
    expect(parsed.options).toMatchObject({
      dryRun: false,
      includeWorktrees: true,
      repoRoot: '/work/repo',
      since: DEFAULT_BACKFILL_SINCE,
      until: NOW.toISOString(),
    });
    expect(parsed.options.projectsDir).toBe(
      path.join(process.env.HOME ?? '', '.claude', 'projects'),
    );
  });

  it('reads flags with a space or an equals sign', () => {
    const parsed = parse([
      '--dry-run',
      '--since=2026-10-01',
      '--until',
      '2026-10-02T00:00:00Z',
      '--projects-dir',
      '/tmp/p',
      '--repo-root=/r',
      '--no-worktrees',
      '--timeout-ms',
      '500',
    ]);
    expect(parsed).toEqual({
      kind: 'options',
      options: {
        dryRun: true,
        includeWorktrees: false,
        projectsDir: '/tmp/p',
        repoRoot: '/r',
        since: '2026-10-01T00:00:00.000Z',
        timeoutMs: 500,
        until: '2026-10-02T00:00:00.000Z',
      },
    });
  });

  it('takes the repo root from the hook variables before the working directory', () => {
    const parsed = parse([], { CLAUDE_PROJECT_DIR: '/from/env' });
    expect(parsed.kind === 'options' && parsed.options.repoRoot).toBe(
      '/from/env',
    );
  });

  it('answers --help', () => {
    expect(parse(['--help'])).toEqual({ kind: 'help' });
  });

  it.each([
    [['--nope'], 'unknown argument: --nope'],
    [['--since'], '--since needs a value'],
    [['--since', 'yesterday'], '--since is not an ISO-8601 date: yesterday'],
    [['--timeout-ms', '0'], '--timeout-ms must be a positive integer: 0'],
    [
      ['--since', '2026-11-01', '--until', '2026-10-01'],
      '--since (2026-11-01T00:00:00.000Z) must be before --until (2026-10-01T00:00:00.000Z)',
    ],
  ])('rejects %j', (argv, message) => {
    expect(parse(argv)).toEqual({ error: message, kind: 'error' });
  });
});
