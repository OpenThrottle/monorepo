import { DEFAULT_CHAT_TOOLBAR_STATE } from '@openthrottle/react-router-chat-state';
import { describe, expect, test } from 'vitest';

import { WorkspaceEditorId } from '~/__generated__/graphql';
import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';
import { PREFERENCES_INTENTS } from '~/routing/settings/data/data.preferences';

import {
  clearChatToolbarAgentPicks,
  isDefaultEditorEnabled,
  resolveDefaultAgent,
  toPreferencesFeedback,
} from '../user-preferences';

describe('resolveDefaultAgent', () => {
  test('is none when nothing is stored', () => {
    expect(resolveDefaultAgent(null, MOCK_PLAN_RUN_MODELS)).toEqual({
      kind: 'none',
    });
  });

  test('is valid when the stored agent maps onto an offered option', () => {
    const resolved = resolveDefaultAgent(
      { backend: 'claude', effort: 'high', model: 'opus' },
      MOCK_PLAN_RUN_MODELS,
    );

    expect(resolved).toEqual({
      draft: { backend: 'claude', effort: 'high', model: 'opus' },
      kind: 'valid',
      optionId: 'claude|opus',
    });
  });

  test('drops an effort the backend cannot take', () => {
    const resolved = resolveDefaultAgent(
      { backend: 'cursor', effort: 'high', model: 'gpt-5.2' },
      MOCK_PLAN_RUN_MODELS,
    );

    expect(resolved.kind === 'valid' ? resolved.draft.effort : null).toBe('');
  });

  test('is stale when the model is no longer offered', () => {
    const stored = { backend: 'claude', effort: null, model: 'gone' };

    expect(resolveDefaultAgent(stored, MOCK_PLAN_RUN_MODELS)).toEqual({
      kind: 'stale',
      stored,
    });
  });

  test('is stale when the backend cannot run a plan', () => {
    const stored = { backend: 'grok', effort: null, model: 'grok-4' };

    expect(resolveDefaultAgent(stored, MOCK_PLAN_RUN_MODELS).kind).toBe(
      'stale',
    );
  });
});

describe('isDefaultEditorEnabled', () => {
  test('accepts the system default', () => {
    expect(isDefaultEditorEnabled(null, [])).toBe(true);
  });

  test('accepts an enabled editor', () => {
    expect(
      isDefaultEditorEnabled(WorkspaceEditorId.Cursor, [
        WorkspaceEditorId.Cursor,
      ]),
    ).toBe(true);
  });

  test('flags an editor that is not enabled', () => {
    expect(
      isDefaultEditorEnabled(WorkspaceEditorId.Cursor, [
        WorkspaceEditorId.Vscode,
      ]),
    ).toBe(false);
  });

  test('makes no claim when the enabled editors are unknown', () => {
    expect(isDefaultEditorEnabled(WorkspaceEditorId.Cursor, null)).toBe(true);
  });
});

describe('toPreferencesFeedback', () => {
  test('is empty before any submission', () => {
    expect(toPreferencesFeedback(undefined)).toEqual({
      error: null,
      saved: false,
    });
  });

  test('carries the error', () => {
    expect(
      toPreferencesFeedback({
        error: 'nope',
        intent: PREFERENCES_INTENTS.saveDefaultEditor,
      }),
    ).toEqual({ error: 'nope', saved: false });
  });

  test('reports a save', () => {
    expect(
      toPreferencesFeedback({
        intent: PREFERENCES_INTENTS.saveDefaultEditor,
        ok: true,
      }),
    ).toEqual({ error: null, saved: true });
  });
});

describe('clearChatToolbarAgentPicks', () => {
  test('drops model and reasoning, keeping every other pick', () => {
    const cleared = clearChatToolbarAgentPicks({
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      modelId: 'claude|opus',
      perBackend: {
        claude: { permissionMode: 'supervised', reasoning: 'max' },
      },
      reasoning: 'high',
      repositoryIds: ['repo-1'],
    });

    expect(cleared.modelId).toBeUndefined();
    expect(cleared.reasoning).toBeUndefined();
    expect(cleared.perBackend).toEqual({
      claude: { permissionMode: 'supervised' },
    });
    expect(cleared.repositoryIds).toEqual(['repo-1']);
  });
});
