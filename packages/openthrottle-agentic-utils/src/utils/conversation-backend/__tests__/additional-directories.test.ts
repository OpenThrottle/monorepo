import { describe, expect, it, vi } from 'vitest';
import {
  maxDirectoriesForBackend,
  warnUnsupportedAdditionalDirectories,
} from '../additional-directories.ts';

describe('maxDirectoriesForBackend', () => {
  it('lets the --add-dir-capable backends exceed one', () => {
    expect(maxDirectoriesForBackend('antigravity')).toBeGreaterThan(1);
    expect(maxDirectoriesForBackend('claude')).toBeGreaterThan(1);
  });

  it('caps every backend without a repeatable directory flag at one', () => {
    for (const backend of ['codex', 'cursor', 'gemini', 'grok', 'opencode']) {
      expect(maxDirectoriesForBackend(backend)).toBe(1);
    }
  });

  it('caps an unknown backend conservatively', () => {
    expect(maxDirectoriesForBackend('brand-new-cli')).toBe(1);
  });
});

describe('warnUnsupportedAdditionalDirectories', () => {
  it('warns naming the backend and the count', () => {
    const warn = vi.fn();
    warnUnsupportedAdditionalDirectories('cursor', ['/a', '/b'], warn);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('cursor');
    expect(warn.mock.calls[0][0]).toContain('2');
  });

  it('stays silent for an absent or empty list', () => {
    const warn = vi.fn();
    warnUnsupportedAdditionalDirectories('cursor', undefined, warn);
    warnUnsupportedAdditionalDirectories('cursor', [], warn);

    expect(warn).not.toHaveBeenCalled();
  });
});
