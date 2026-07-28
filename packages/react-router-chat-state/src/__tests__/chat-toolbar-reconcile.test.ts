import { describe, expect, test } from 'vitest';
import {
  ChatComposerMode,
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  CHAT_TOOLBAR_STATE_VERSION,
  DEFAULT_CHAT_TOOLBAR_STATE,
  type ChatToolbarState,
} from '../atom.chat-toolbar';
import {
  reconcileChatToolbarState,
  type ReconcileRepositoryOption,
} from '../chat-toolbar-reconcile';

const cliModel: ChatModelOption = {
  description: 'Agent CLI',
  groupId: 'agent-clis',
  id: 'cursor',
  label: 'Cursor',
};

const openaiModel: ChatModelOption = {
  description: 'ollama',
  groupId: 'openai:ollama',
  id: 'http://localhost:11434/v1::llama3',
  label: 'llama3',
};

const repoA: ReconcileRepositoryOption = { id: 'repo-a' };
const repoB: ReconcileRepositoryOption = { id: 'repo-b' };
const personaA: ChatPersonaOption = { id: 'persona-a', label: 'Persona A' };
const personaB: ChatPersonaOption = { id: 'persona-b', label: 'Persona B' };

const persisted = (overrides: Partial<ChatToolbarState>): ChatToolbarState => ({
  ...DEFAULT_CHAT_TOOLBAR_STATE,
  ...overrides,
});

describe('reconcileChatToolbarState', () => {
  describe('modelId', () => {
    test('keeps a persisted model that still exists (exact id match)', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor' }),
        {
          models: [openaiModel, cliModel],
          personas: [],
          repositories: [],
        },
      );
      expect(result.modelId).toBe('cursor');
    });

    test('falls back to the first model when the persisted id is gone', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'removed-endpoint::gpt' }),
        { models: [cliModel], personas: [], repositories: [] },
      );
      expect(result.modelId).toBe('cursor');
    });

    test('is undefined when no models are discovered', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor' }),
        {
          models: [],
          personas: [],
          repositories: [],
        },
      );
      expect(result.modelId).toBeUndefined();
    });
  });

  describe('personaId', () => {
    test('keeps a persisted persona that still exists', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', personaId: 'persona-b' }),
        { models: [cliModel], personas: [personaA, personaB], repositories: [repoA] }, // prettier-ignore
      );
      expect(result.personaId).toBe('persona-b');
    });

    test('falls back to the first persona when the persisted id is gone', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', personaId: 'gone' }),
        { models: [cliModel], personas: [personaA], repositories: [repoA] },
      );
      expect(result.personaId).toBe('persona-a');
    });
  });

  describe('repositoryId', () => {
    test('keeps a persisted repository that still exists (CLI backend)', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', repositoryId: 'repo-b' }),
        { models: [cliModel], personas: [], repositories: [repoA, repoB] },
      );
      expect(result.repositoryId).toBe('repo-b');
    });

    test('falls back to the first repository when the persisted id is gone', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', repositoryId: 'gone' }),
        { models: [cliModel], personas: [], repositories: [repoA] },
      );
      expect(result.repositoryId).toBe('repo-a');
    });

    test('is cleared for a backend that does not run in a repository', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: openaiModel.id, repositoryId: 'repo-a' }),
        { models: [openaiModel], personas: [], repositories: [repoA] },
      );
      expect(result.repositoryId).toBeUndefined();
    });
  });

  describe('capability re-gating', () => {
    test('keeps reasoning/serviceTier/permissionMode valid for the CLI backend', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: 'cursor',
          permissionMode: ChatPermissionMode.supervised,
          reasoning: ChatReasoningLevel.high,
          serviceTier: ChatServiceTier.fast,
        }),
        { models: [cliModel], personas: [], repositories: [repoA] },
      );
      expect(result.permissionMode).toBe(ChatPermissionMode.supervised);
      expect(result.reasoning).toBe(ChatReasoningLevel.high);
      expect(result.serviceTier).toBe(ChatServiceTier.fast);
    });

    test('clears a reasoning level the CLI backend does not permit', () => {
      // `ultra` is a valid enum value but not in CLI_BACKEND_CAPABILITIES.
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', reasoning: ChatReasoningLevel.ultra }),
        { models: [cliModel], personas: [], repositories: [repoA] },
      );
      expect(result.reasoning).toBeUndefined();
    });

    test('clears CLI-valid controls when the effective backend is openai', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: openaiModel.id,
          permissionMode: ChatPermissionMode.fullAccess,
          reasoning: ChatReasoningLevel.high,
          serviceTier: ChatServiceTier.fast,
        }),
        { models: [openaiModel], personas: [], repositories: [] },
      );
      expect(result.permissionMode).toBeUndefined();
      expect(result.reasoning).toBeUndefined();
      expect(result.serviceTier).toBeUndefined();
    });

    test('re-gates when a removed CLI model falls back to an openai model', () => {
      // Persisted CLI selection with CLI-valid reasoning, but the CLI model is
      // gone so it falls back to the openai model, which permits no reasoning.
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', reasoning: ChatReasoningLevel.medium }),
        { models: [openaiModel], personas: [], repositories: [] },
      );
      expect(result.modelId).toBe(openaiModel.id);
      expect(result.reasoning).toBeUndefined();
    });
  });

  describe('perBackend override (v2)', () => {
    const claudeModel: ChatModelOption = {
      description: 'Agent CLI',
      groupId: 'agent-clis',
      id: 'claude',
      label: 'Claude',
    };
    const codexModel: ChatModelOption = {
      description: 'Agent CLI',
      groupId: 'agent-clis',
      id: 'codex',
      label: 'Codex',
    };

    test('a per-backend override wins over the global fallback', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: 'claude',
          perBackend: { claude: { reasoning: ChatReasoningLevel.high } },
          reasoning: ChatReasoningLevel.low,
        }),
        { models: [claudeModel], personas: [], repositories: [repoA] },
      );
      expect(result.reasoning).toBe(ChatReasoningLevel.high);
    });

    test('falls back to the global when the effective backend has no entry', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: 'claude',
          perBackend: { codex: { reasoning: ChatReasoningLevel.high } },
          reasoning: ChatReasoningLevel.low,
        }),
        { models: [claudeModel], personas: [], repositories: [repoA] },
      );
      expect(result.reasoning).toBe(ChatReasoningLevel.low);
    });

    test('distinct per-CLI values coexist (claude=high vs codex=low)', () => {
      const state = persisted({
        modelId: 'claude',
        perBackend: {
          claude: { reasoning: ChatReasoningLevel.high },
          codex: { reasoning: ChatReasoningLevel.low },
        },
      });
      const models = [claudeModel, codexModel];

      const asClaude = reconcileChatToolbarState(state, {
        models,
        personas: [],
        repositories: [repoA],
      });
      const asCodex = reconcileChatToolbarState(
        { ...state, modelId: 'codex' },
        { models, personas: [], repositories: [repoA] },
      );

      expect(asClaude.reasoning).toBe(ChatReasoningLevel.high);
      expect(asCodex.reasoning).toBe(ChatReasoningLevel.low);
    });

    test('gates a per-backend override the effective backend disallows', () => {
      // The openai backend permits no reasoning levels; the override must still
      // be capability-gated, not trusted verbatim.
      const result = reconcileChatToolbarState(
        persisted({
          modelId: openaiModel.id,
          perBackend: { openai: { reasoning: ChatReasoningLevel.high } },
        }),
        { models: [openaiModel], personas: [], repositories: [] },
      );
      expect(result.reasoning).toBeUndefined();
    });

    test('passes perBackend through unchanged (derive-only)', () => {
      const perBackend = { claude: { reasoning: ChatReasoningLevel.high } };
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'claude', perBackend }),
        { models: [claudeModel], personas: [], repositories: [repoA] },
      );
      expect(result.perBackend).toEqual(perBackend);
    });
  });

  describe('purity', () => {
    test('preserves mode and version', () => {
      const result = reconcileChatToolbarState(
        persisted({ mode: ChatComposerMode.build, modelId: 'cursor' }),
        { models: [cliModel], personas: [], repositories: [repoA] },
      );
      expect(result.mode).toBe(ChatComposerMode.build);
      expect(result.version).toBe(CHAT_TOOLBAR_STATE_VERSION);
    });

    test('does not mutate its input and writes nothing to storage', () => {
      const input = persisted({
        modelId: 'gone',
        permissionMode: ChatPermissionMode.fullAccess,
        personaId: 'gone',
        reasoning: ChatReasoningLevel.high,
        repositoryId: 'gone',
        serviceTier: ChatServiceTier.fast,
      });
      const snapshot = { ...input };

      localStorage.clear();
      reconcileChatToolbarState(input, {
        models: [openaiModel],
        personas: [personaA],
        repositories: [repoA],
      });

      expect(input).toEqual(snapshot);
      expect(localStorage.length).toBe(0);
    });
  });
});
