/**
 * @description Tests for the server-wide repeatables-owner resolver: the four marker cases from the
 * worktree-stack plan (explicit override, shared, isolated, absent) plus the degrade-to-owner path
 * for an unrecognised marker value.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveRepeatablesOwner } from './repeatable-job.owner.ts';

describe('resolveRepeatablesOwner', () => {
  beforeEach(() => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
    vi.stubEnv('OT_WORKTREE_DB', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when the marker is absent (the primary checkout)', () => {
    it('is the owner', () => {
      expect(resolveRepeatablesOwner()).toEqual({
        owner: true,
        reason: 'canonical checkout',
      });
    });

    it('ignores a workspace path that merely looks like a worktree (the marker is the only detector)', () => {
      vi.stubEnv('WORKSPACE_ROOT', '/Users/dev/.openthrottle/worktrees/acme/monorepo/wt'); // prettier-ignore

      expect(resolveRepeatablesOwner().owner).toBe(true);
    });
  });

  describe('when OT_WORKTREE_DB=shared', () => {
    it('is not the owner and names the marker as the reason', () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');

      const ownership = resolveRepeatablesOwner();

      expect(ownership.owner).toBe(false);
      expect(ownership.reason).toContain('OT_WORKTREE_DB=shared');
    });

    it('tolerates whitespace and case in the marker value', () => {
      vi.stubEnv('OT_WORKTREE_DB', '  Shared ');

      expect(resolveRepeatablesOwner().owner).toBe(false);
    });
  });

  describe('when OT_WORKTREE_DB=isolated', () => {
    it('is the owner (own Postgres and Redis, behaves like a primary)', () => {
      vi.stubEnv('OT_WORKTREE_DB', 'isolated');

      const ownership = resolveRepeatablesOwner();

      expect(ownership.owner).toBe(true);
      expect(ownership.reason).toContain('OT_WORKTREE_DB=isolated');
    });
  });

  describe('when the marker value is unrecognised', () => {
    it('degrades to owner, matching resolveWorktreeDbMode (it owns its own containers)', () => {
      vi.stubEnv('OT_WORKTREE_DB', 'bogus');

      expect(resolveRepeatablesOwner().owner).toBe(true);
    });
  });

  describe('when OT_SCHEDULED_JOBS_OWNER is set (explicit override)', () => {
    it.each(['true', '1', ' TRUE '])(
      'makes a shared worktree the owner for %j',
      (value) => {
        vi.stubEnv('OT_WORKTREE_DB', 'shared');
        vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', value);

        expect(resolveRepeatablesOwner().owner).toBe(true);
      },
    );

    it.each(['false', '0', ' False '])(
      'makes the primary and an isolated worktree non-owners for %j',
      (value) => {
        vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', value);

        vi.stubEnv('OT_WORKTREE_DB', '');
        expect(resolveRepeatablesOwner().owner).toBe(false);

        vi.stubEnv('OT_WORKTREE_DB', 'isolated');
        expect(resolveRepeatablesOwner().owner).toBe(false);
      },
    );

    it('falls through to the marker for an unrecognised override value', () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'maybe');

      expect(resolveRepeatablesOwner().owner).toBe(false);
    });
  });
});
