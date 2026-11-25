import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  CHAT_PERMISSION_MODE,
  CHAT_REASONING_LEVEL,
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
        permissionMode: CHAT_PERMISSION_MODE.fullAccess,
      });

      expect(result.permissionMode).toBe(CHAT_PERMISSION_MODE.fullAccess);
      expect(result.perBackend.claude?.permissionMode).toBe(
        CHAT_PERMISSION_MODE.fullAccess,
      );
    });

    test('overwrites a stale per-backend value so it no longer shadows the pick', () => {
      const before = state({
        modelId: claudeModel.id,
        perBackend: {
          claude: { permissionMode: CHAT_PERMISSION_MODE.supervised },
        },
        permissionMode: CHAT_PERMISSION_MODE.supervised,
      });

      const after = writeChatToolbarBackendPref(before, 'claude', {
        permissionMode: CHAT_PERMISSION_MODE.fullAccess,
      });
      const effective = reconcileChatToolbarState(after, {
        models: [claudeModel],
        personas: [],
        repositories: [],
      });

      expect(effective.permissionMode).toBe(CHAT_PERMISSION_MODE.fullAccess);
    });

    test('keeps the other prefs on that backend entry', () => {
      const result = writeChatToolbarBackendPref(
        state({
          perBackend: { claude: { reasoning: CHAT_REASONING_LEVEL.high } },
        }),
        'claude',
        { permissionMode: CHAT_PERMISSION_MODE.autoAcceptEdits },
      );

      expect(result.perBackend.claude).toEqual({
        permissionMode: CHAT_PERMISSION_MODE.autoAcceptEdits,
        reasoning: CHAT_REASONING_LEVEL.high,
      });
    });

    test('leaves other backends untouched', () => {
      const result = writeChatToolbarBackendPref(
        state({
          perBackend: {
            codex: { permissionMode: CHAT_PERMISSION_MODE.supervised },
          },
        }),
        'claude',
        { permissionMode: CHAT_PERMISSION_MODE.fullAccess },
      );

      expect(result.perBackend.codex?.permissionMode).toBe(
        CHAT_PERMISSION_MODE.supervised,
      );
    });
  });

  describe('when no backend is selected', () => {
    test('writes only the global field', () => {
      const result = writeChatToolbarBackendPref(state({}), undefined, {
        permissionMode: CHAT_PERMISSION_MODE.fullAccess,
      });

      expect(result.permissionMode).toBe(CHAT_PERMISSION_MODE.fullAccess);
      expect(result.perBackend).toEqual({});
    });
  });
});
