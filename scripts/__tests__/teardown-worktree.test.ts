import { describe, expect, it } from 'vitest';

import {
  WORKTREE_COMPOSE_PROJECT_PREFIX,
  resolveWorktreeComposeProject,
} from '../teardown_worktree.ts';

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
