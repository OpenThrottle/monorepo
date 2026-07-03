import { RouterContextProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { createTestRouterContext } from './router-context';

describe('createTestRouterContext', () => {
  it('builds a real RouterContextProvider (satisfies loader/action context typing)', () => {
    const context = createTestRouterContext();

    expect(context).toBeInstanceOf(RouterContextProvider);
    expect(typeof context.get).toBe('function');
    expect(typeof context.set).toBe('function');
  });

  it('builds a fresh, isolated provider per call', () => {
    expect(createTestRouterContext()).not.toBe(createTestRouterContext());
  });
});
