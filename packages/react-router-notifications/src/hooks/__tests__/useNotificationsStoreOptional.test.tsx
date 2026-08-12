import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '../../components/NotificationsStoreProvider';
import { useNotificationsStoreOptional } from '../useNotificationsStoreOptional';

describe('useNotificationsStoreOptional', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('returns null without throwing when used outside NotificationsStoreProvider', () => {
    const { result } = renderHook(() => useNotificationsStoreOptional());

    expect(result.current).toBeNull();
  });

  test('returns the store context value when used within NotificationsStoreProvider', () => {
    const { result } = renderHook(() => useNotificationsStoreOptional(), {
      wrapper: ({ children }) => (
        <NotificationsStoreProvider persist={false}>
          {children}
        </NotificationsStoreProvider>
      ),
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.notifications).toEqual([]);
    expect(result.current?.unreadCount).toBe(0);
    expect(typeof result.current?.addNotification).toBe('function');
  });

  test('accepts an empty options object without affecting the result', () => {
    const { result } = renderHook(() => useNotificationsStoreOptional({}), {
      wrapper: ({ children }) => (
        <NotificationsStoreProvider persist={false}>
          {children}
        </NotificationsStoreProvider>
      ),
    });

    expect(result.current).not.toBeNull();
  });
});
