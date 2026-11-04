import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  backfillWorktreeDbMarker,
  resolveWorktreeDbMode,
  worktreeDbModeFromEnv,
  writeWorktreeDbMarker,
} from '../utils/worktree-db.ts';

const SERVER_ENV = 'applications/openthrottle-server/.env';

const makeWorktree = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'ot-worktree-db-'));

  mkdirSync(join(root, 'applications/openthrottle-server'), {
    recursive: true,
  });

  for (const [relative, contents] of Object.entries(files)) {
    writeFileSync(join(root, relative), contents);
  }

  return root;
};

describe('resolveWorktreeDbMode', () => {
  it('treats an absent or empty marker as the primary checkout', () => {
    expect(resolveWorktreeDbMode(undefined)).toBe('primary');
    expect(resolveWorktreeDbMode('')).toBe('primary');
  });

  it('resolves the two marker values, tolerating case, whitespace and quotes', () => {
    expect(resolveWorktreeDbMode('shared')).toBe('shared');
    expect(resolveWorktreeDbMode(' Shared ')).toBe('shared');
    expect(resolveWorktreeDbMode('"shared"')).toBe('shared');
    expect(resolveWorktreeDbMode('isolated')).toBe('isolated');
  });

  it('degrades an unrecognised value to primary so the checkout owns its containers', () => {
    expect(resolveWorktreeDbMode('sharedd')).toBe('primary');
    expect(resolveWorktreeDbMode('true')).toBe('primary');
  });

  it('reads the marker from an environment map', () => {
    expect(worktreeDbModeFromEnv({ OT_WORKTREE_DB: 'shared' })).toBe('shared');
    expect(worktreeDbModeFromEnv({})).toBe('primary');
  });
});

describe('writeWorktreeDbMarker', () => {
  it('writes the marker into the root and server .env, replacing any prior value', () => {
    const root = makeWorktree({
      '.env': 'A=1\nOT_WORKTREE_DB=isolated\n',
      [SERVER_ENV]: 'B=2',
    });

    const written = writeWorktreeDbMarker(root, 'shared');

    expect(written).toHaveLength(2);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('A=1\nOT_WORKTREE_DB=shared\n'); // prettier-ignore
    expect(readFileSync(join(root, SERVER_ENV), 'utf8')).toBe('B=2\nOT_WORKTREE_DB=shared\n'); // prettier-ignore
  });

  it('skips .env files that do not exist', () => {
    const root = makeWorktree({ '.env': 'A=1\n' });

    expect(writeWorktreeDbMarker(root, 'shared')).toEqual([join(root, '.env')]);
  });
});

describe('backfillWorktreeDbMarker', () => {
  it('writes shared into every .env that lacks the marker (a pre-change worktree)', () => {
    const root = makeWorktree({ '.env': 'A=1\n', [SERVER_ENV]: 'B=2\n' });

    expect(backfillWorktreeDbMarker(root)).toHaveLength(2);
    expect(readFileSync(join(root, '.env'), 'utf8')).toContain('OT_WORKTREE_DB=shared'); // prettier-ignore
    expect(readFileSync(join(root, SERVER_ENV), 'utf8')).toContain('OT_WORKTREE_DB=shared'); // prettier-ignore
  });

  it('is idempotent and never overwrites an existing value', () => {
    const root = makeWorktree({
      '.env': 'OT_WORKTREE_DB=isolated\n',
      [SERVER_ENV]: 'B=2\n',
    });

    expect(backfillWorktreeDbMarker(root)).toEqual([join(root, SERVER_ENV)]);
    expect(backfillWorktreeDbMarker(root)).toEqual([]);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('OT_WORKTREE_DB=isolated\n'); // prettier-ignore
  });

  it('does not treat a commented-out marker as set', () => {
    const root = makeWorktree({ '.env': '# OT_WORKTREE_DB=shared\n' });

    expect(backfillWorktreeDbMarker(root)).toEqual([join(root, '.env')]);
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('# OT_WORKTREE_DB=shared\nOT_WORKTREE_DB=shared\n'); // prettier-ignore
  });
});
