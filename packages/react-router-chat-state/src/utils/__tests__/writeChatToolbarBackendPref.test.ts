import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  ChatPermissionMode,
  ChatReasoningLevel,
} from '@openthrottle/react-router-chat';
import { describe, expect, test } from 'vitest';

import type { ChatToolbarState } from '../../data/data.chat-toolbar-state';
import { DEFAULT_CHAT_TOOLBAR_STATE } from '../../data/data.chat-toolbar-state';
import { reconcileChatToolbarState } from '../reconcileChatToolbarState';
import { writeChatToolbarBackendPref } from '../writeChatToolbarBackendPref';

const claudeModel: ChatModelOption = {
  description: 'claude-code',
  groupId: 'claude',
  id: 'claude|opus',
  label: 'opus',
};

const state = (overrides: Partial<ChatToolbarState>): ChatToolbarState => {
  return {
    ...DEFAULT_CHAT_TOOLBAR_STATE,
    ...overrides,
  };
};

describe('writeChatToolbarBackendPref', () => {
  describe('when a backend is selected', () => {
    test('writes the value under that backend and as the global fallback', () => {
      const result = writeChatToolbarBackendPref(state({}), 'claude', {
        permissionMode: ChatPermissionMode.fullAccess,
      });

      expect(result.permissionMode).toBe(ChatPermissionMode.fullAccess);
      expect(result.perBackend.claude?.permissionMode).toBe(
        ChatPermissionMode.fullAccess,
      );
    });

    test('overwrites a stale per-backend value so it no longer shadows the pick', () => {
      const before = state({
        modelId: claudeModel.id,
        perBackend: {
          claude: { permissionMode: ChatPermissionMode.supervised },
        },
        permissionMode: ChatPermissionMode.supervised,
      });

      const after = writeChatToolbarBackendPref(before, 'claude', {
        permissionMode: ChatPermissionMode.fullAccess,
      });
      const effective = reconcileChatToolbarState(after, {
        models: [claudeModel],
        personas: [],
        repositories: [],
      });

      expect(effective.permissionMode).toBe(ChatPermissionMode.fullAccess);
    });

    test('keeps the other prefs on that backend entry', () => {
      const result = writeChatToolbarBackendPref(
        state({
          perBackend: { claude: { reasoning: ChatReasoningLevel.high } },
        }),
        'claude',
        { permissionMode: ChatPermissionMode.autoAcceptEdits },
      );

      expect(result.perBackend.claude).toEqual({
        permissionMode: ChatPermissionMode.autoAcceptEdits,
        reasoning: ChatReasoningLevel.high,
      });
    });

    test('leaves other backends untouched', () => {
      const result = writeChatToolbarBackendPref(
        state({
          perBackend: {
            codex: { permissionMode: ChatPermissionMode.supervised },
          },
        }),
        'claude',
        { permissionMode: ChatPermissionMode.fullAccess },
      );

      expect(result.perBackend.codex?.permissionMode).toBe(
        ChatPermissionMode.supervised,
      );
    });
  });

  describe('when no backend is selected', () => {
    test('writes only the global field', () => {
      const result = writeChatToolbarBackendPref(state({}), undefined, {
        permissionMode: ChatPermissionMode.fullAccess,
      });

      expect(result.permissionMode).toBe(ChatPermissionMode.fullAccess);
      expect(result.perBackend).toEqual({});
    });
  });
});
