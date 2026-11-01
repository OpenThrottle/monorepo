import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'; // prettier-ignore
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  refreshWorktreeComposeOverride,
  WORKTREE_COMPOSE_FILE,
  worktreeComposeOverride,
} from '../utils/worktree-compose.ts';

// What the generator wrote before migrations was disabled in shared mode.
const STALE_OVERRIDE = `services:
  postgres:
    profiles: ["disabled"]
  redis:
    profiles: ["disabled"]
`;

const makeWorktree = (
  marker: string | undefined,
  override: string | undefined,
): string => {
  const root = mkdtempSync(join(tmpdir(), 'ot-worktree-compose-'));

  writeFileSync(join(root, '.env'), marker === undefined ? 'POSTGRES_PORT=6010\n' : `OT_WORKTREE_DB=${marker}\n`); // prettier-ignore

  if (override !== undefined) {
    writeFileSync(join(root, WORKTREE_COMPOSE_FILE), override);
  }

  return root;
};

const readOverride = (root: string): string =>
  readFileSync(join(root, WORKTREE_COMPOSE_FILE), 'utf8');

describe('refreshWorktreeComposeOverride', () => {
  describe('when a shared worktree has a stale override', () => {
    it('rewrites it with the current shared override', () => {
      const root = makeWorktree('shared', STALE_OVERRIDE);

      expect(refreshWorktreeComposeOverride(root, {})).toEqual({ db: 'shared', kind: 'rewritten' }); // prettier-ignore
      expect(readOverride(root)).toBe(worktreeComposeOverride('shared'));
    });
  });

  describe('when an isolated worktree has a stale override', () => {
    it('rewrites it with the isolated override, never the shared one', () => {
      const root = makeWorktree('isolated', worktreeComposeOverride('shared'));

      expect(refreshWorktreeComposeOverride(root, {})).toEqual({ db: 'isolated', kind: 'rewritten' }); // prettier-ignore
      expect(readOverride(root)).toBe(worktreeComposeOverride('isolated'));
    });
  });

  describe('when the override is already current', () => {
    it('leaves the file untouched', () => {
      const root = makeWorktree('shared', worktreeComposeOverride('shared'));
      const past = new Date('2026-01-01T00:00:00Z');

      utimesSync(join(root, WORKTREE_COMPOSE_FILE), past, past);

      expect(refreshWorktreeComposeOverride(root, {})).toEqual({ kind: 'unchanged' }); // prettier-ignore
      expect(statSync(join(root, WORKTREE_COMPOSE_FILE)).mtimeMs).toBe(past.getTime()); // prettier-ignore
    });
  });

  describe('when the worktree has no override', () => {
    it('does not create one', () => {
      const root = makeWorktree('shared', undefined);

      expect(refreshWorktreeComposeOverride(root, {})).toEqual({ kind: 'missing' }); // prettier-ignore
      expect(existsSync(join(root, WORKTREE_COMPOSE_FILE))).toBe(false);
    });
  });

  describe('when the checkout has no OT_WORKTREE_DB marker', () => {
    it('treats it as the primary and writes nothing', () => {
      const root = makeWorktree(undefined, STALE_OVERRIDE);

      expect(refreshWorktreeComposeOverride(root, {})).toEqual({ kind: 'primary' }); // prettier-ignore
      expect(readOverride(root)).toBe(STALE_OVERRIDE);
    });
  });

  describe('when the override cannot be read', () => {
    it('reports a failure instead of throwing', () => {
      const root = makeWorktree('shared', undefined);

      mkdirSync(join(root, WORKTREE_COMPOSE_FILE));

      expect(refreshWorktreeComposeOverride(root, {}).kind).toBe('failed');
    });
  });
});
