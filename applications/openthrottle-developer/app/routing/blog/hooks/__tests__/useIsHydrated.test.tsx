import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { useIsHydrated } from '../useIsHydrated';

const Probe = (): React.ReactElement => (
  <span>{useIsHydrated() ? 'hydrated' : 'server'}</span>
);

describe('useIsHydrated', () => {
  test('is false when rendered on the server', () => {
    expect(renderToString(<Probe />)).toContain('server');
  });

  test('is true once rendered on the client', () => {
    const { result } = renderHook(() => useIsHydrated());

    expect(result.current).toBe(true);
  });
});
