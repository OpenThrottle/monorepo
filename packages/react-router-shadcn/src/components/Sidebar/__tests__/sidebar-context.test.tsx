import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SidebarContext } from '../sidebar-context';
import type { SidebarContextProps } from '../sidebar-context';

describe('sidebar-context', () => {
  test('defaults to null without a provider', () => {
    const { result } = renderHook(() => React.useContext(SidebarContext));
    expect(result.current).toBeNull();
  });

  test('exposes the provided value to consumers', () => {
    const value: SidebarContextProps = {
      isMobile: false,
      open: true,
      openMobile: false,
      setOpen: () => {},
      setOpenMobile: () => {},
      state: 'expanded',
      toggleSidebar: () => {},
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarContext.Provider value={value}>
        {children}
      </SidebarContext.Provider>
    );
    const { result } = renderHook(() => React.useContext(SidebarContext), {
      wrapper,
    });
    expect(result.current?.state).toBe('expanded');
    expect(result.current?.open).toBe(true);
  });
});
