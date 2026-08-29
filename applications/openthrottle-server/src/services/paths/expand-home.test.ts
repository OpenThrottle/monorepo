import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { expandHome } from './expand-home';

describe('expandHome', () => {
  it('expands a bare ~ to the home directory', () => {
    expect(expandHome('~')).toBe(homedir());
  });

  it('expands a leading ~/ and keeps the rest of the path', () => {
    expect(expandHome('~/OpenThrottle/repositories')).toBe(
      join(homedir(), 'OpenThrottle/repositories'),
    );
  });

  it('leaves an already-absolute path alone', () => {
    expect(expandHome('/srv/repositories')).toBe('/srv/repositories');
  });

  it('leaves a relative path alone — expanding is not the same as resolving', () => {
    expect(expandHome('relative/path')).toBe('relative/path');
  });

  it("does not expand another user's home", () => {
    // `~other` is not supported by the shell paths this mirrors, so it must pass through unchanged
    // rather than silently becoming a subdirectory of the current user's home.
    expect(expandHome('~other/path')).toBe('~other/path');
  });

  it('leaves a ~ that is not leading alone', () => {
    expect(expandHome('/srv/~backup')).toBe('/srv/~backup');
  });

  it('leaves an empty string alone', () => {
    expect(expandHome('')).toBe('');
  });
});
