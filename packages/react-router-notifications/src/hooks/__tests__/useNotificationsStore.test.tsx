import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '../../components/NotificationsStoreProvider';
import { useNotificationsStore } from '../useNotificationsStore';

describe('useNotificationsStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('returns store context when used within NotificationsStoreProvider', () => {
    const { result } = renderHook(() => useNotificationsStore(), {
      wrapper: ({ children }) => (
        <NotificationsStoreProvider persist={false}>
          {children}
        </NotificationsStoreProvider>
      ),
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  test('throws when used outside NotificationsStoreProvider', () => {
    expect(() => renderHook(() => useNotificationsStore())).toThrow(
      'useNotificationsStore must be used within a NotificationsStoreProvider',
    );
  });
});
