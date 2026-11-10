/**
 * Unit tests for `utils/checkout-root`. A real directory tree rather than a mocked `fs`: the
 * behaviour under test is the ancestor walk and the `.git` dir-vs-file distinction, which a mock
 * would let a naive implementation pass.
 *
 * Layout: <tmp>/container/repo (primary clone, `.git` dir, `skills/ot-plans`),
 *         <tmp>/container/wt   (linked worktree, `.git` file),
 *         <tmp>/elsewhere      (no checkout at all).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  detectScope,
  resolveCheckoutRoot,
  resolveHookRepoRoot,
} from '../../index.ts';

describe('checkout root resolution', () => {
  let tmpRoot: string;
  let container: string;
  let repo: string;
  let worktree: string;
  let elsewhere: string;

  beforeAll(() => {
    tmpRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-checkout-')),
    );
    container = path.join(tmpRoot, 'container');
    repo = path.join(container, 'repo');
    worktree = path.join(container, 'wt');
    elsewhere = path.join(tmpRoot, 'elsewhere');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'skills', 'ot-plans'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'packages', 'deep'), { recursive: true });
    fs.mkdirSync(worktree, { recursive: true });
    fs.writeFileSync(path.join(worktree, '.git'), 'gitdir: ../repo/.git\n');
    fs.mkdirSync(elsewhere, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  describe('resolveCheckoutRoot', () => {
    it('returns the checkout root for the root itself', () => {
      expect(resolveCheckoutRoot(repo)).toBe(repo);
    });

    it('walks up from a subdirectory', () => {
      expect(resolveCheckoutRoot(path.join(repo, 'packages', 'deep'))).toBe(
        repo,
      );
    });

    it('recognises a linked worktree by its .git file', () => {
      expect(resolveCheckoutRoot(worktree)).toBe(worktree);
    });

    it('returns null outside any checkout', () => {
      expect(resolveCheckoutRoot(container)).toBeNull();
    });

    it('returns null for null, empty and relative input', () => {
      expect(resolveCheckoutRoot(null)).toBeNull();
      expect(resolveCheckoutRoot('')).toBeNull();
      expect(resolveCheckoutRoot('relative/dir')).toBeNull();
    });
  });

  describe('resolveHookRepoRoot', () => {
    it('keeps a project dir that is a checkout', () => {
      expect(
        resolveHookRepoRoot({ payloadCwd: worktree, projectDir: repo }),
      ).toBe(repo);
    });

    it('lifts a project dir inside a checkout to its root', () => {
      expect(
        resolveHookRepoRoot({
          payloadCwd: null,
          projectDir: path.join(repo, 'packages'),
        }),
      ).toBe(repo);
    });

    it('falls back to the payload cwd checkout when launched above the repo', () => {
      expect(
        resolveHookRepoRoot({ payloadCwd: repo, projectDir: container }),
      ).toBe(repo);
    });

    it('returns the project dir unchanged when neither resolves', () => {
      expect(
        resolveHookRepoRoot({ payloadCwd: elsewhere, projectDir: container }),
      ).toBe(container);
    });
  });

  describe('the plan 25f11313 regression', () => {
    it('scored an in-repo skill third-party against the container folder', () => {
      expect(detectScope('ot-plans', container)).toBe('third-party');
    });

    it('scores it ours once the root comes from the payload cwd', () => {
      const root = resolveHookRepoRoot({
        payloadCwd: repo,
        projectDir: container,
      });
      expect(detectScope('ot-plans', root)).toBe('ours');
    });
  });
});
