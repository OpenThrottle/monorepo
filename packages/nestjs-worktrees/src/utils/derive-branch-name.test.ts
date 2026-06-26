/**
 * @description Tests for deriveBranchName branch-name construction and the slugification it relies
 * on. A derived name must always be a git-safe ref under the `ralph/` namespace: lowercased,
 * special chars collapsed to single hyphens, no leading/trailing hyphen on the slug, and bounded
 * length. Garbage/empty titles fall back to a lockedBy-derived name. This guards against producing
 * invalid or option-like (`-`-leading) refs that would later be rejected by createBranchInWorktree.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveBranchName } from './parent-job';

describe('deriveBranchName', () => {
  beforeEach(() => {
    // Pin the clock so the uniqueness suffix/timestamp is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('from a plan title', () => {
    it('slugifies a human-readable title under the ralph/ namespace', () => {
      const name = deriveBranchName('job-1', 'Human Readable Branch Names');
      expect(name).toMatch(/^ralph\/human-readable-branch-names-[a-z0-9]+$/);
    });

    it('collapses special characters and repeated separators into single hyphens', () => {
      const name = deriveBranchName('job-1', 'Fix:  the @@@ thing!!! (now)');
      const slug = name.replace(/^ralph\//, '').replace(/-[a-z0-9]+$/, '');
      expect(slug).toBe('fix-the-thing-now');
      expect(slug).not.toMatch(/--/);
    });

    it('does not emit a leading or trailing hyphen on the slug', () => {
      const name = deriveBranchName('job-1', '!!!leading and trailing!!!');
      const slug = name.replace(/^ralph\//, '').replace(/-[a-z0-9]+$/, '');
      expect(slug.startsWith('-')).toBe(false);
      expect(slug.endsWith('-')).toBe(false);
    });

    it('truncates the slug to the 50-char bound', () => {
      const longTitle = 'a'.repeat(120);
      const name = deriveBranchName('job-1', longTitle);
      const slug = name.replace(/^ralph\//, '').replace(/-[a-z0-9]+$/, '');
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('falls back to lockedBy when the title slugifies to empty', () => {
      const name = deriveBranchName('job-1', '!!!@@@###');
      // No usable slug -> lockedBy-based fallback (always begins ralph/).
      expect(name).toMatch(/^ralph\/job-1-\d+$/);
    });
  });

  describe('from lockedBy fallback (no title)', () => {
    it('sanitizes lockedBy and bounds it to 12 chars', () => {
      const name = deriveBranchName(
        'my/weird:lockedBy*value-with-extra-length',
      );
      const slug = name.replace(/^ralph\//, '').replace(/-\d+$/, '');
      expect(slug).toBe('my-weird-loc');
      expect(slug.length).toBeLessThanOrEqual(12);
    });

    it('always produces a name in the ralph/ namespace', () => {
      expect(deriveBranchName('job-1')).toMatch(/^ralph\//);
    });
  });
});
