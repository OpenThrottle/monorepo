import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  resolveWorktreeComposeProject,
  teardownComposeArgs,
  WORKTREE_COMPOSE_PROJECT_PREFIX,
} from '../teardown_worktree.ts';
import {
  resolveWorktreeQueuePrefix,
  worktreeQueueKeyPattern,
} from '../utils/worktree-queue-keys.ts';
import { pidfilePath, renderPidRecord } from '../utils/worktree-serve.ts';

/**
 * The guard rail these tests exist for: teardown runs `docker compose down`, and the one thing it
 * must never do is bring down the primary checkout's stack while a developer is working in it.
 */
describe('resolveWorktreeComposeProject', () => {
  const WORKTREE = '/Users/matt/worktrees/openthrottle/loop-plan-x';

  it('returns the project when the .env value is the one setup_worktree would have generated', () => {
    expect(
      resolveWorktreeComposeProject({
        composeProjectName: 'openthrottle-loop-plan-x',
        hasComposeOverride: true,
        worktreePath: WORKTREE,
      }),
    ).toBe('openthrottle-loop-plan-x');
  });

  it('matches the directory name case-insensitively, as setup_worktree lowercases the slug', () => {
    expect(
      resolveWorktreeComposeProject({
        composeProjectName: 'openthrottle-loud-caps',
        hasComposeOverride: true,
        worktreePath: '/Users/matt/worktrees/openthrottle/LOUD-CAPS',
      }),
    ).toBe('openthrottle-loud-caps');
  });

  it('does nothing without the generated compose override — the worktree was never isolated', () => {
    expect(
      resolveWorktreeComposeProject({
        composeProjectName: 'openthrottle-loop-plan-x',
        hasComposeOverride: false,
        worktreePath: WORKTREE,
      }),
    ).toBeNull();
  });

  it.each([undefined, '', '   '])(
    'does nothing when .env names no project (%p)',
    (composeProjectName) => {
      expect(
        resolveWorktreeComposeProject({
          composeProjectName,
          hasComposeOverride: true,
          worktreePath: WORKTREE,
        }),
      ).toBeNull();
    },
  );

  it('refuses an unprefixed project name', () => {
    expect(
      resolveWorktreeComposeProject({
        composeProjectName: 'loop-plan-x',
        hasComposeOverride: true,
        worktreePath: WORKTREE,
      }),
    ).toBeNull();
  });

  it('refuses a prefixed name that is not THIS worktree — a copied or hand-edited .env', () => {
    expect(
      resolveWorktreeComposeProject({
        composeProjectName: 'openthrottle-some-other-worktree',
        hasComposeOverride: true,
        worktreePath: WORKTREE,
      }),
    ).toBeNull();
  });

  it('refuses the primary checkout project, the case that would stop a live dev stack', () => {
    // `openthrottle` is what docker compose derives for the main checkout's directory: it carries
    // the prefix by coincidence, so only the exact-match check rejects it.
    expect(
      resolveWorktreeComposeProject({
        composeProjectName: 'openthrottle',
        hasComposeOverride: true,
        worktreePath: WORKTREE,
      }),
    ).toBeNull();
  });

  it('keeps the prefix setup_worktree.ts writes', () => {
    expect(WORKTREE_COMPOSE_PROJECT_PREFIX).toBe('openthrottle-');
  });
});

describe('teardownComposeArgs', () => {
  it('removes volumes only for an isolated worktree (it owns a database)', () => {
    expect(
      teardownComposeArgs({ isolated: true, project: 'openthrottle-x' }),
    ).toEqual([
      'compose',
      '-p',
      'openthrottle-x',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.worktree.yml',
      'down',
      '--remove-orphans',
      '--volumes', // prettier-ignore
    ]);
  });

  it('never removes volumes for a shared worktree', () => {
    expect(teardownComposeArgs({ isolated: false, project: 'openthrottle-x' })).not.toContain('--volumes'); // prettier-ignore
  });
});

/**
 * Shared-worktree teardown deletes BullMQ keys from the PRIMARY's Redis, so the pattern it scans is
 * the whole safety story: exactly this worktree's prefix, colon-terminated, never anything wider.
 */
describe('resolveWorktreeQueuePrefix', () => {
  it('derives bull:<container prefix> with the trailing dash stripped, as resolveQueuePrefix does', () => {
    expect(
      resolveWorktreeQueuePrefix({
        OT_CONTAINER_PREFIX: 'wt-loop-plan-50422dc3-',
      }),
    ).toBe('bull:wt-loop-plan-50422dc3');
  });

  it('lets OT_QUEUE_PREFIX override the container prefix', () => {
    expect(
      resolveWorktreeQueuePrefix({
        OT_CONTAINER_PREFIX: 'wt-x-',
        OT_QUEUE_PREFIX: 'bull:wt-custom',
      }),
    ).toBe('bull:wt-custom');
  });

  it.each([
    {},
    { OT_CONTAINER_PREFIX: '' },
    { OT_CONTAINER_PREFIX: ' - ' },
    { OT_QUEUE_PREFIX: '  ' },
  ])('falls back to the primary prefix when nothing is set (%j)', (env) => {
    expect(resolveWorktreeQueuePrefix(env)).toBe('bull');
  });
});

describe('worktreeQueueKeyPattern', () => {
  it('terminates the prefix with a colon so a sibling worktree sharing its stem is not matched', () => {
    expect(worktreeQueueKeyPattern('bull:wt-loop-plan')).toBe(
      'bull:wt-loop-plan:*',
    );
    // The unterminated glob would also hit this sibling; the colon-terminated one cannot.
    expect('bull:wt-loop-plan-stale-worktree-checkouts:q:meta'.startsWith('bull:wt-loop-plan:')).toBe(false); // prettier-ignore
  });

  it('refuses the primary prefix, so a misconfigured env can never wipe bull:*', () => {
    expect(worktreeQueueKeyPattern('bull')).toBeNull();
  });

  it.each(['', 'bull:', 'bull:wt-', 'bull:other', 'wt-x', 'queue:wt-x'])(
    'refuses a prefix that is not a worktree prefix (%p)',
    (prefix) => {
      expect(worktreeQueueKeyPattern(prefix)).toBeNull();
    },
  );

  it.each(['bull:wt-*', 'bull:wt-a?', 'bull:wt-[ab]', 'bull:wt-a\\b'])(
    'refuses a prefix carrying glob characters (%p)',
    (prefix) => {
      expect(worktreeQueueKeyPattern(prefix)).toBeNull();
    },
  );
});

describe('teardown stops worktree:serve processes', () => {
  const TEARDOWN = join(import.meta.dirname, '../teardown_worktree.ts');

  const isAlive = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  it('stops a live served process group before the worktree is removed', () => {
    const worktree = realpathSync(
      mkdtempSync(join(tmpdir(), 'ot-teardown-serve-')),
    );
    // Isolated: no shared-Redis cleanup to reach for; no compose override: no docker.
    writeFileSync(join(worktree, '.env'), 'OT_WORKTREE_DB=isolated\n');
    mkdirSync(join(worktree, '.worktree/logs'), { recursive: true });

    // Like a worktree:serve launch whose CLI has exited: the process leads its own group and is
    // reparented to init, so it is reaped the moment it dies. A direct child of this test would
    // linger as a zombie and keep --stop waiting out its whole grace period.
    const pid = Number(
      execFileSync(
        'sh',
        [
          '-c',
          'perl -e \'setpgrp(0, 0); exec "sleep", 120\' >/dev/null 2>&1 & echo $!',
        ],
        { cwd: worktree, encoding: 'utf8' },
      ).trim(),
    );

    try {
      writeFileSync(
        pidfilePath(worktree, 'server'),
        renderPidRecord({ apiOnly: true, pid, port: 65_000, startedAt: '2026-11-15T00:00:00.000Z', task: 'openthrottle-server:dev-api' }), // prettier-ignore
      );

      execFileSync(process.execPath, ['--experimental-strip-types', TEARDOWN], { cwd: worktree, stdio: 'pipe' }); // prettier-ignore

      expect(isAlive(pid)).toBe(false);
    } finally {
      if (isAlive(pid)) {
        process.kill(-pid, 'SIGKILL');
      }
      rmSync(worktree, { force: true, recursive: true });
    }
  });
});
