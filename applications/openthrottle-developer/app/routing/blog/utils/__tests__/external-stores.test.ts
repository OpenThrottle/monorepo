import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  getPrefersDark,
  subscribeToNothing,
  subscribeToPrefersDark,
} from '../external-stores';

const stubMatchMedia = (
  matches: boolean,
): {
  readonly addEventListener: ReturnType<typeof vi.fn>;
  readonly removeEventListener: ReturnType<typeof vi.fn>;
} => {
  const query = {
    addEventListener: vi.fn(),
    matches,
    removeEventListener: vi.fn(),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );

  return query;
};

describe('external stores', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('subscribeToNothing returns a callable no-op unsubscribe', () => {
    expect(subscribeToNothing()()).toBeUndefined();
  });

  test.each([true, false])('getPrefersDark reports %s', (matches) => {
    stubMatchMedia(matches);

    expect(getPrefersDark()).toBe(matches);
  });

  test('subscribeToPrefersDark adds and removes the change listener', () => {
    const query = stubMatchMedia(false);
    const onChange = vi.fn();

    const unsubscribe = subscribeToPrefersDark(onChange);

    expect(query.addEventListener).toHaveBeenCalledWith('change', onChange);

    unsubscribe();

    expect(query.removeEventListener).toHaveBeenCalledWith('change', onChange);
  });
});
