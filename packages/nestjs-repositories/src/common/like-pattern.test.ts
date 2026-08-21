import { describe, expect, it } from 'vitest';
import { escapeLikePattern, toLikeContainsPattern } from './like-pattern';

describe('escapeLikePattern', () => {
  it('leaves ordinary branch-like text untouched', () => {
    expect(escapeLikePattern('feat/usage-branch-filter')).toBe(
      'feat/usage-branch-filter',
    );
  });

  it('escapes percent, underscore, and backslash', () => {
    expect(escapeLikePattern('feat/100%_done')).toBe('feat/100\\%\\_done');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('escapes every occurrence, not just the first', () => {
    expect(escapeLikePattern('%%__')).toBe('\\%\\%\\_\\_');
  });

  describe('when the value is empty', () => {
    it('returns an empty string', () => {
      expect(escapeLikePattern('')).toBe('');
    });
  });
});

describe('toLikeContainsPattern', () => {
  it('wraps the escaped value in percent anchors', () => {
    expect(toLikeContainsPattern('main')).toBe('%main%');
    expect(toLikeContainsPattern('100%')).toBe('%100\\%%');
  });
});
