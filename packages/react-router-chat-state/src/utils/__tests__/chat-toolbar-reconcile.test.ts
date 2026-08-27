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
} from '../../data/atom.chat-toolbar';
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

// A CLI backend that advertises reasoning (claude), used where the test needs a
// backend with a reasoning surface — cursor bakes reasoning into the model id
// and so exposes no separate reasoning/tier controls.
const claudeCliModel: ChatModelOption = {
  description: 'Agent CLI',
  groupId: 'agent-clis',
  id: 'claude',
  label: 'Claude',
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

  describe('modelId re-resolution (v2)', () => {
    const openai = (baseUrl: string, model: string): ChatModelOption => ({
      description: 'ollama',
      groupId: 'openai:ollama',
      id: `${baseUrl}::${model}`,
      label: model,
    });
    const claudeModel: ChatModelOption = {
      description: 'Agent CLI',
      groupId: 'agent-clis',
      id: 'claude',
      label: 'Claude',
    };

    test('keeps the model when the endpoint moved to a new port (same host)', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'http://localhost:11434/v1::llama3' }),
        {
          models: [openai('http://localhost:11500/v1', 'llama3')],
          personas: [],
          repositories: [],
        },
      );
      expect(result.modelId).toBe('http://localhost:11500/v1::llama3');
    });

    test('keeps a single same-name candidate on a different host', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'http://host-a:11434/v1::llama3' }),
        {
          models: [openai('http://host-b:11434/v1', 'llama3')],
          personas: [],
          repositories: [],
        },
      );
      expect(result.modelId).toBe('http://host-b:11434/v1::llama3');
    });

    test('falls back to models[0] when multiple different-host endpoints share the name', () => {
      const models = [
        openai('http://host-b:11434/v1', 'llama3'),
        openai('http://host-c:11434/v1', 'llama3'),
      ];
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'http://host-a:11434/v1::llama3' }),
        { models, personas: [], repositories: [] },
      );
      expect(result.modelId).toBe(models[0].id);
    });

    test('degrades a stale CLI model override to the bare backend option', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor|gpt-5.2' }),
        {
          models: [cliModel, claudeModel],
          personas: [],
          repositories: [repoA],
        },
      );
      expect(result.modelId).toBe('cursor');
    });

    test('degrades a stale CLI override to another same-backend override when no bare option', () => {
      const cursorGpt6: ChatModelOption = {
        description: 'Agent CLI',
        groupId: 'agent-clis',
        id: 'cursor|gpt-6',
        label: 'gpt-6',
      };
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor|gpt-5.2' }),
        {
          models: [cursorGpt6, claudeModel],
          personas: [],
          repositories: [repoA],
        },
      );
      expect(result.modelId).toBe('cursor|gpt-6');
    });

    test('falls back to models[0] when a stale CLI override has no same-backend option', () => {
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor|gpt-5.2' }),
        { models: [claudeModel], personas: [], repositories: [repoA] },
      );
      expect(result.modelId).toBe('claude');
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
    test('keeps a supported reasoning + permission mode for a CLI backend, clears tier (no backend routes it)', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: 'claude',
          permissionMode: ChatPermissionMode.supervised,
          reasoning: ChatReasoningLevel.high,
          serviceTier: ChatServiceTier.fast,
        }),
        { models: [claudeCliModel], personas: [], repositories: [repoA] },
      );
      expect(result.permissionMode).toBe(ChatPermissionMode.supervised);
      expect(result.reasoning).toBe(ChatReasoningLevel.high);
      // No backend advertises a service-tier control, so it is always cleared.
      expect(result.serviceTier).toBeUndefined();
    });

    test('clears a reasoning level the CLI backend does not permit', () => {
      // claude tops out at `max`; `ultra` is not advertised, so it is cleared.
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'claude', reasoning: ChatReasoningLevel.ultra }),
        { models: [claudeCliModel], personas: [], repositories: [repoA] },
      );
      expect(result.reasoning).toBeUndefined();
    });

    test('clears reasoning + tier for cursor (both are encoded in the model id, not controls)', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: 'cursor',
          permissionMode: ChatPermissionMode.fullAccess,
          reasoning: ChatReasoningLevel.high,
          serviceTier: ChatServiceTier.fast,
        }),
        { models: [cliModel], personas: [], repositories: [repoA] },
      );
      // cursor still has a permission surface, but no reasoning/tier controls.
      expect(result.permissionMode).toBe(ChatPermissionMode.fullAccess);
      expect(result.reasoning).toBeUndefined();
      expect(result.serviceTier).toBeUndefined();
    });

    test('clears permission + tier for openai but keeps a supported reasoning level', () => {
      const result = reconcileChatToolbarState(
        persisted({
          modelId: openaiModel.id,
          permissionMode: ChatPermissionMode.fullAccess,
          reasoning: ChatReasoningLevel.high,
          serviceTier: ChatServiceTier.fast,
        }),
        { models: [openaiModel], personas: [], repositories: [] },
      );
      // openai has no permission surface and no tier, but forwards reasoning
      // best-effort — so high is retained while the other two are cleared.
      expect(result.permissionMode).toBeUndefined();
      expect(result.reasoning).toBe(ChatReasoningLevel.high);
      expect(result.serviceTier).toBeUndefined();
    });

    test('re-gates when a removed CLI model falls back to an openai model', () => {
      // Persisted CLI selection with a reasoning level openai also permits; the
      // CLI model is gone so it falls back to openai, which keeps the level.
      const result = reconcileChatToolbarState(
        persisted({ modelId: 'cursor', reasoning: ChatReasoningLevel.medium }),
        { models: [openaiModel], personas: [], repositories: [] },
      );
      expect(result.modelId).toBe(openaiModel.id);
      expect(result.reasoning).toBe(ChatReasoningLevel.medium);
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
      // openai forwards low/medium/high best-effort but not `ultra`; the override
      // must still be capability-gated, not trusted verbatim.
      const result = reconcileChatToolbarState(
        persisted({
          modelId: openaiModel.id,
          perBackend: { openai: { reasoning: ChatReasoningLevel.ultra } },
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

  describe('persist', () => {
    test('passes persist through unchanged (never capability-gated)', () => {
      const off = reconcileChatToolbarState(persisted({ persist: false }), {
        models: [cliModel],
        personas: [],
        repositories: [repoA],
      });
      expect(off.persist).toBe(false);

      const on = reconcileChatToolbarState(persisted({ persist: true }), {
        models: [openaiModel],
        personas: [],
        repositories: [],
      });
      expect(on.persist).toBe(true);
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
