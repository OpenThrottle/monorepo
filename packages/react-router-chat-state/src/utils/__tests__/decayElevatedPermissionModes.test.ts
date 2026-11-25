import {
  CHAT_PERMISSION_MODE,
  CHAT_REASONING_LEVEL,
  CHAT_SERVICE_TIER,
} from '@openthrottle/react-router-chat';
import { describe, expect, test } from 'vitest';

import type { ChatToolbarState } from '../../data/chat-toolbar-state';
import { DEFAULT_CHAT_TOOLBAR_STATE } from '../../data/chat-toolbar-state';
import { decayElevatedPermissionModes } from '../decayElevatedPermissionModes';

const state = (overrides: Partial<ChatToolbarState>): ChatToolbarState => {
  return {
    ...DEFAULT_CHAT_TOOLBAR_STATE,
    ...overrides,
  };
};

describe('decayElevatedPermissionModes', () => {
  test('clears Full access in the global field', () => {
    const result = decayElevatedPermissionModes(
      state({ permissionMode: CHAT_PERMISSION_MODE.fullAccess }),
    );
    expect(result.permissionMode).toBeUndefined();
  });

  test('clears Auto-accept edits in the global field', () => {
    const result = decayElevatedPermissionModes(
      state({ permissionMode: CHAT_PERMISSION_MODE.autoAcceptEdits }),
    );
    expect(result.permissionMode).toBeUndefined();
  });

  test('leaves Supervised untouched (same reference, no-op)', () => {
    const input = state({ permissionMode: CHAT_PERMISSION_MODE.supervised });
    expect(decayElevatedPermissionModes(input)).toBe(input);
  });

  test('returns the same reference when nothing is elevated', () => {
    const input = state({
      perBackend: { cursor: { reasoning: CHAT_REASONING_LEVEL.high } },
    });
    expect(decayElevatedPermissionModes(input)).toBe(input);
  });

  test('sweeps elevated permissionMode across global and perBackend entries', () => {
    const result = decayElevatedPermissionModes(
      state({
        perBackend: {
          claude: {
            permissionMode: CHAT_PERMISSION_MODE.fullAccess,
            reasoning: CHAT_REASONING_LEVEL.high,
          },
          codex: { permissionMode: CHAT_PERMISSION_MODE.autoAcceptEdits },
          cursor: {
            permissionMode: CHAT_PERMISSION_MODE.supervised,
            serviceTier: CHAT_SERVICE_TIER.fast,
          },
        },
        permissionMode: CHAT_PERMISSION_MODE.fullAccess,
      }),
    );

    expect(result.permissionMode).toBeUndefined();
    // claude keeps its non-elevated prefs but loses the elevated permissionMode.
    expect(result.perBackend.claude).toEqual({
      reasoning: CHAT_REASONING_LEVEL.high,
    });
    // codex held only an elevated permissionMode → the entry is dropped.
    expect(result.perBackend.codex).toBeUndefined();
    // cursor is supervised → fully preserved.
    expect(result.perBackend.cursor).toEqual({
      permissionMode: CHAT_PERMISSION_MODE.supervised,
      serviceTier: CHAT_SERVICE_TIER.fast,
    });
  });

  test('is idempotent', () => {
    const once = decayElevatedPermissionModes(
      state({
        perBackend: {
          claude: { permissionMode: CHAT_PERMISSION_MODE.fullAccess },
        },
        permissionMode: CHAT_PERMISSION_MODE.fullAccess,
      }),
    );
    // A second pass finds nothing elevated → returns the same reference.
    expect(decayElevatedPermissionModes(once)).toBe(once);
  });

  describe('when the user opted in to remember the permission mode', () => {
    test('keeps elevated modes in the global field and every backend (same reference)', () => {
      const input = state({
        perBackend: {
          claude: { permissionMode: CHAT_PERMISSION_MODE.fullAccess },
          codex: { permissionMode: CHAT_PERMISSION_MODE.autoAcceptEdits },
        },
        permissionMode: CHAT_PERMISSION_MODE.fullAccess,
        rememberPermissionMode: true,
      });
      expect(decayElevatedPermissionModes(input)).toBe(input);
    });
  });

  describe('when the opt-in is off', () => {
    test('still clears elevated modes', () => {
      const result = decayElevatedPermissionModes(
        state({
          permissionMode: CHAT_PERMISSION_MODE.fullAccess,
          rememberPermissionMode: false,
        }),
      );
      expect(result.permissionMode).toBeUndefined();
      expect(result.rememberPermissionMode).toBe(false);
    });
  });
});
