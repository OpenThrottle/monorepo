import { describe, expect, test } from 'vitest';
import {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import {
  DEFAULT_CHAT_TOOLBAR_STATE,
  type ChatToolbarState,
} from '../../data/atom.chat-toolbar';
import { decayElevatedPermissionModes } from '../chat-toolbar-decay';

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
