import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { ChatPermissionMode } from '@openthrottle/react-router-chat';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
  type ChatToolbarState,
} from '../../data/atom.chat-toolbar';
import {
  CHAT_TOOLBAR_SESSION_SENTINEL_KEY,
  useSessionPermissionDecay,
} from '../useSessionPermissionDecay';

describe('useSessionPermissionDecay', () => {
  const renderInStore = (): void => {
    const store = createStore();
    renderHook(() => useSessionPermissionDecay(), {
      wrapper: ({ children }: { readonly children: React.ReactNode }) =>
        React.createElement(Provider, { store }, children),
    });
  };

  const seedToolbar = (blob: Partial<ChatToolbarState>): void => {
    localStorage.setItem(
      CHAT_TOOLBAR_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_CHAT_TOOLBAR_STATE, ...blob }),
    );
  };

  const readPersisted = (): ChatToolbarState =>
    JSON.parse(localStorage.getItem(CHAT_TOOLBAR_STORAGE_KEY) ?? '{}');

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  test('decays once when the session sentinel is absent, then sets it', () => {
    seedToolbar({ permissionMode: ChatPermissionMode.fullAccess });

    renderInStore();

    expect(readPersisted().permissionMode).toBeUndefined();
    expect(sessionStorage.getItem(CHAT_TOOLBAR_SESSION_SENTINEL_KEY)).toBe('1');
  });

  test('is a no-op when the session sentinel is already present', () => {
    sessionStorage.setItem(CHAT_TOOLBAR_SESSION_SENTINEL_KEY, '1');
    seedToolbar({ permissionMode: ChatPermissionMode.fullAccess });

    renderInStore();

    expect(readPersisted().permissionMode).toBe(ChatPermissionMode.fullAccess);
  });

  test('still decays (without throwing) when sessionStorage is unavailable', () => {
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('sessionStorage denied');
    });
    seedToolbar({ permissionMode: ChatPermissionMode.fullAccess });

    expect(() => renderInStore()).not.toThrow();
    expect(readPersisted().permissionMode).toBeUndefined();
  });
});
