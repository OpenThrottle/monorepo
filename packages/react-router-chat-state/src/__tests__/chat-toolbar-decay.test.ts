import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
  type ChatToolbarState,
} from '../atom.chat-toolbar';
import {
  CHAT_TOOLBAR_SESSION_SENTINEL_KEY,
  decayElevatedPermissionModes,
  useSessionPermissionDecay,
} from '../chat-toolbar-decay';

const state = (overrides: Partial<ChatToolbarState>): ChatToolbarState => ({
  ...DEFAULT_CHAT_TOOLBAR_STATE,
  ...overrides,
});

describe('decayElevatedPermissionModes', () => {
  test('clears Full access in the global field', () => {
    const result = decayElevatedPermissionModes(
      state({ permissionMode: ChatPermissionMode.fullAccess }),
    );
    expect(result.permissionMode).toBeUndefined();
  });

  test('clears Auto-accept edits in the global field', () => {
    const result = decayElevatedPermissionModes(
      state({ permissionMode: ChatPermissionMode.autoAcceptEdits }),
    );
    expect(result.permissionMode).toBeUndefined();
  });

  test('leaves Supervised untouched (same reference, no-op)', () => {
    const input = state({ permissionMode: ChatPermissionMode.supervised });
    expect(decayElevatedPermissionModes(input)).toBe(input);
  });

  test('returns the same reference when nothing is elevated', () => {
    const input = state({
      perBackend: { cursor: { reasoning: ChatReasoningLevel.high } },
    });
    expect(decayElevatedPermissionModes(input)).toBe(input);
  });

  test('sweeps elevated permissionMode across global and perBackend entries', () => {
    const result = decayElevatedPermissionModes(
      state({
        perBackend: {
          claude: {
            permissionMode: ChatPermissionMode.fullAccess,
            reasoning: ChatReasoningLevel.high,
          },
          codex: { permissionMode: ChatPermissionMode.autoAcceptEdits },
          cursor: {
            permissionMode: ChatPermissionMode.supervised,
            serviceTier: ChatServiceTier.fast,
          },
        },
        permissionMode: ChatPermissionMode.fullAccess,
      }),
    );

    expect(result.permissionMode).toBeUndefined();
    // claude keeps its non-elevated prefs but loses the elevated permissionMode.
    expect(result.perBackend.claude).toEqual({
      reasoning: ChatReasoningLevel.high,
    });
    // codex held only an elevated permissionMode → the entry is dropped.
    expect(result.perBackend.codex).toBeUndefined();
    // cursor is supervised → fully preserved.
    expect(result.perBackend.cursor).toEqual({
      permissionMode: ChatPermissionMode.supervised,
      serviceTier: ChatServiceTier.fast,
    });
  });

  test('is idempotent', () => {
    const once = decayElevatedPermissionModes(
      state({
        perBackend: {
          claude: { permissionMode: ChatPermissionMode.fullAccess },
        },
        permissionMode: ChatPermissionMode.fullAccess,
      }),
    );
    // A second pass finds nothing elevated → returns the same reference.
    expect(decayElevatedPermissionModes(once)).toBe(once);
  });
});

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
