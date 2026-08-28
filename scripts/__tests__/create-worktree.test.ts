import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  fallbackName,
  payloadName,
  resolveWorktreeRoot,
  sanitizeWorktreeName,
} from '../create_worktree.ts';

describe('sanitizeWorktreeName', () => {
  it('strips a ref prefix and unsafe characters', () => {
    expect(sanitizeWorktreeName('refs/heads/feat/thing')).toBe('feat-thing');
    expect(sanitizeWorktreeName('a b/c')).toBe('a-b-c');
    expect(sanitizeWorktreeName('ok-name_1.2')).toBe('ok-name_1.2');
  });

  it('trims leading and trailing dashes produced by sanitizing', () => {
    expect(sanitizeWorktreeName('///weird///')).toBe('weird');
    expect(sanitizeWorktreeName('!!!')).toBe('');
  });
});

describe('payloadName', () => {
  it('tries the candidate fields in order', () => {
    expect(payloadName({ name: 'a', worktree_name: 'b' })).toBe('a');
    expect(payloadName({ worktree_name: 'b' })).toBe('b');
    expect(payloadName({ branch: 'feat/x' })).toBe('feat/x');
    expect(payloadName({ slug: 's' })).toBe('s');
  });

  it('returns undefined for empty or absent names', () => {
    expect(payloadName({ name: '' })).toBeUndefined();
    expect(payloadName({})).toBeUndefined();
    expect(payloadName('not an object')).toBeUndefined();
    expect(payloadName(null)).toBeUndefined();
  });
});

describe('fallbackName', () => {
  it('derives wt-<sid8> from the session id', () => {
    expect(fallbackName({ session_id: 'abcdef1234567890' }, 42)).toBe(
      'wt-abcdef12',
    );
  });

  it('falls back to wt-<pid> without a session id', () => {
    expect(fallbackName({}, 42)).toBe('wt-42');
    expect(fallbackName(undefined, 42)).toBe('wt-42');
  });
});

describe('resolveWorktreeRoot', () => {
  const repo = mkdtempSync(join(tmpdir(), 'wt-root-'));

  it('prefers OT_WORKTREE_ROOT from the environment', () => {
    const { root, source } = resolveWorktreeRoot(repo, {
      OT_WORKTREE_ROOT: '/tmp/custom/',
    });

    expect(root).toBe('/tmp/custom');
    expect(source).toBe('OT_WORKTREE_ROOT env');
  });

  it('reads the primary checkout .env next (last assignment wins)', () => {
    writeFileSync(
      join(repo, '.env'),
      'OT_WORKTREE_ROOT=/old\nOT_WORKTREE_ROOT="/from-env-file"\n',
    );

    const { root, source } = resolveWorktreeRoot(repo, {});

    expect(root).toBe('/from-env-file');
    expect(source).toBe(`${repo}/.env`);
  });

  it('defaults to the sibling openthrottle-worktrees directory', () => {
    const bare = mkdtempSync(join(tmpdir(), 'wt-root-bare-'));

    const { root, source } = resolveWorktreeRoot(bare, {});

    expect(root).toBe(join(bare, '..', 'openthrottle-worktrees'));
    expect(source).toBe('default (sibling of the repo)');
  });

  it('expands ~ against the provided home', () => {
    const { root } = resolveWorktreeRoot(
      repo,
      { OT_WORKTREE_ROOT: '~/trees' },
      '/Users/someone',
    );

    expect(root).toBe('/Users/someone/trees');
  });

  it('rejects a relative root', () => {
    expect(() =>
      resolveWorktreeRoot(repo, { OT_WORKTREE_ROOT: 'relative/path' }),
    ).toThrow(/absolute path/);
  });
});
