import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ToggleGroupContext } from '../toggle-group-context';

describe('toggle-group-context', () => {
  test('defaults to an empty variant object', () => {
    const { result } = renderHook(() => React.useContext(ToggleGroupContext));
    expect(result.current).toEqual({});
  });

  test('exposes the provided variant to consumers', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ToggleGroupContext.Provider value={{ size: 'sm', variant: 'outline' }}>
        {children}
      </ToggleGroupContext.Provider>
    );
    const { result } = renderHook(() => React.useContext(ToggleGroupContext), {
      wrapper,
    });
    expect(result.current.variant).toBe('outline');
    expect(result.current.size).toBe('sm');
  });
});
