import { afterEach, describe, expect, it } from 'vitest';

import { isHostDark } from '../dark-mode';

describe('isHostDark', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark', 'light');
  });

  it('is true when the document element has the dark class', () => {
    document.documentElement.classList.add('dark');
    expect(isHostDark()).toBe(true);
  });

  it('is false when the document element has the light class', () => {
    document.documentElement.classList.add('light');
    expect(isHostDark()).toBe(false);
  });

  it('falls back to the OS preference when no class is set', () => {
    // jsdom matchMedia is stubbed to matches: false (see tests/setup), so the
    // fallback resolves to light.
    expect(isHostDark()).toBe(false);
  });
});
