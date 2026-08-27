import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { APP_NAME } from '@openthrottle/react-router-utils';
import {
  ChatComposerMode,
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import {
  CHAT_TOOLBAR_STATE_VERSION,
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
  normalizeChatToolbarState,
} from '../atom.chat-toolbar';

describe('chat toolbar constants', () => {
  test('CHAT_TOOLBAR_STORAGE_KEY derives the app-namespaced key at runtime', () => {
    // Namespaced by APP_NAME (window.env / process.env) so the single shared
    // atom module keys per consuming app; the exact value depends on the runtime
    // env, so assert the derivation rather than a hardcoded app name.
    expect(CHAT_TOOLBAR_STORAGE_KEY).toBe(`${APP_NAME}:chat:toolbar`);
    expect(CHAT_TOOLBAR_STORAGE_KEY).toMatch(/:chat:toolbar$/);
  });

  test('DEFAULT_CHAT_TOOLBAR_STATE defaults to plan mode, persist on, everything else unset', () => {
    expect(DEFAULT_CHAT_TOOLBAR_STATE).toEqual({
      mode: ChatComposerMode.plan,
      modelId: undefined,
      perBackend: {},
      permissionMode: undefined,
      persist: true,
      personaId: undefined,
      reasoning: undefined,
      repositoryIds: [],
      serviceTier: undefined,
      version: CHAT_TOOLBAR_STATE_VERSION,
    });
  });
});

describe('normalizeChatToolbarState', () => {
  describe('when value is not a plain object', () => {
    test('returns defaults for null', () => {
      expect(normalizeChatToolbarState(null)).toEqual(
        DEFAULT_CHAT_TOOLBAR_STATE,
      );
    });

    test('returns defaults for undefined', () => {
      expect(normalizeChatToolbarState(undefined)).toEqual(
        DEFAULT_CHAT_TOOLBAR_STATE,
      );
    });

    test('returns defaults for a string', () => {
      expect(normalizeChatToolbarState('build')).toEqual(
        DEFAULT_CHAT_TOOLBAR_STATE,
      );
    });

    test('returns defaults for an array', () => {
      expect(normalizeChatToolbarState([])).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
    });
  });

  describe('valid current-version (v3) blob', () => {
    test('round-trips a fully-populated blob including perBackend and an explicit persist=false', () => {
      const blob = {
        mode: ChatComposerMode.build,
        modelId: 'http://localhost:11434/v1::llama3',
        perBackend: {
          claude: { reasoning: ChatReasoningLevel.high },
          codex: {
            permissionMode: ChatPermissionMode.supervised,
            reasoning: ChatReasoningLevel.low,
            serviceTier: ChatServiceTier.standard,
          },
        },
        permissionMode: ChatPermissionMode.fullAccess,
        persist: false,
        personaId: 'persona-42',
        reasoning: ChatReasoningLevel.high,
        repositoryIds: ['repo-7', 'repo-8'],
        serviceTier: ChatServiceTier.fast,
        version: CHAT_TOOLBAR_STATE_VERSION,
      };

      expect(normalizeChatToolbarState(blob)).toEqual(blob);
    });
  });

  describe('v2 → v3 migration (persist)', () => {
    test('seeds persist=true on a v2 blob that predates the field', () => {
      const v2Blob = {
        mode: ChatComposerMode.build,
        modelId: 'cursor',
        perBackend: { claude: { reasoning: ChatReasoningLevel.high } },
        permissionMode: ChatPermissionMode.supervised,
        personaId: 'persona-42',
        reasoning: ChatReasoningLevel.high,
        repositoryId: 'repo-7',
        serviceTier: ChatServiceTier.fast,
        version: 2,
      };

      const { repositoryId, ...rest } = v2Blob;
      expect(normalizeChatToolbarState(v2Blob)).toEqual({
        ...rest,
        persist: true,
        repositoryIds: [repositoryId],
        version: CHAT_TOOLBAR_STATE_VERSION,
      });
    });

    test('coerces a non-boolean persist to the default (true)', () => {
      expect(
        normalizeChatToolbarState({ persist: 'nope', version: 2 }).persist,
      ).toBe(true);
    });
  });

  describe('v1 → v4 migration', () => {
    test('migrates a fully-populated v1 blob forward, seeding perBackend + persist and widening the repository', () => {
      const v1Blob = {
        mode: ChatComposerMode.build,
        modelId: 'http://localhost:11434/v1::llama3',
        permissionMode: ChatPermissionMode.fullAccess,
        personaId: 'persona-42',
        reasoning: ChatReasoningLevel.high,
        repositoryId: 'repo-7',
        serviceTier: ChatServiceTier.fast,
        version: 1,
      };

      const { repositoryId, ...rest } = v1Blob;
      expect(normalizeChatToolbarState(v1Blob)).toEqual({
        ...rest,
        perBackend: {},
        persist: true,
        repositoryIds: [repositoryId],
        version: CHAT_TOOLBAR_STATE_VERSION,
      });
    });
  });

  describe('v3 → v4 migration (repositoryId → repositoryIds)', () => {
    test('widens a v3 single repositoryId into a one-element array', () => {
      expect(
        normalizeChatToolbarState({ repositoryId: 'repo-7', version: 3 })
          .repositoryIds,
      ).toEqual(['repo-7']);
    });

    test('yields an empty array for a v3 blob with no repository chosen', () => {
      expect(normalizeChatToolbarState({ version: 3 }).repositoryIds).toEqual(
        [],
      );
    });

    test('does not wipe the rest of a v3 blob', () => {
      expect(
        normalizeChatToolbarState({
          modelId: 'claude',
          persist: false,
          repositoryId: 'repo-7',
          version: 3,
        }),
      ).toEqual({
        ...DEFAULT_CHAT_TOOLBAR_STATE,
        modelId: 'claude',
        persist: false,
        repositoryIds: ['repo-7'],
      });
    });

    test('drops an empty-string legacy repositoryId', () => {
      expect(
        normalizeChatToolbarState({ repositoryId: '', version: 3 })
          .repositoryIds,
      ).toEqual([]);
    });

    test('drops non-string and empty entries from an array, preserving order', () => {
      expect(
        normalizeChatToolbarState({
          repositoryIds: ['repo-b', 42, '', 'repo-a', null],
          version: CHAT_TOOLBAR_STATE_VERSION,
        }).repositoryIds,
      ).toEqual(['repo-b', 'repo-a']);
    });

    test('drops a non-array repositoryIds to empty', () => {
      expect(
        normalizeChatToolbarState({
          repositoryIds: 'repo-a',
          version: CHAT_TOOLBAR_STATE_VERSION,
        }).repositoryIds,
      ).toEqual([]);
    });

    test('prefers repositoryIds over a stale sibling repositoryId', () => {
      expect(
        normalizeChatToolbarState({
          repositoryId: 'stale',
          repositoryIds: ['repo-a'],
          version: CHAT_TOOLBAR_STATE_VERSION,
        }).repositoryIds,
      ).toEqual(['repo-a']);
    });
  });

  describe('legacy / unversioned migration', () => {
    test('migrates an unversioned blob forward, preserving still-valid fields', () => {
      const legacy = {
        mode: ChatComposerMode.build,
        modelId: 'cursor',
        permissionMode: ChatPermissionMode.supervised,
        personaId: 'p1',
        reasoning: ChatReasoningLevel.medium,
        repositoryId: 'r1',
        serviceTier: ChatServiceTier.standard,
        // no version field
      };

      const { repositoryId, ...rest } = legacy;
      expect(normalizeChatToolbarState(legacy)).toEqual({
        ...rest,
        perBackend: {},
        persist: true,
        repositoryIds: [repositoryId],
        version: CHAT_TOOLBAR_STATE_VERSION,
      });
    });

    test('treats a version of 0 as legacy and coerces forward', () => {
      expect(
        normalizeChatToolbarState({ mode: ChatComposerMode.build, version: 0 }),
      ).toEqual({
        ...DEFAULT_CHAT_TOOLBAR_STATE,
        mode: ChatComposerMode.build,
      });
    });
  });

  describe('unknown / newer version degrades to default', () => {
    test('a newer version is not guessed at', () => {
      expect(
        normalizeChatToolbarState({
          mode: ChatComposerMode.build,
          modelId: 'cursor',
          version: 99,
        }),
      ).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
    });

    test('a non-numeric version is treated as legacy (v0), not newer', () => {
      expect(
        normalizeChatToolbarState({
          mode: ChatComposerMode.build,
          version: 'nope',
        }).mode,
      ).toBe(ChatComposerMode.build);
    });
  });

  describe('partial / malformed / unknown-enum coercion', () => {
    test('drops an unknown mode back to the default', () => {
      expect(
        normalizeChatToolbarState({ mode: 'sideways', version: 1 }).mode,
      ).toBe(ChatComposerMode.plan);
    });

    test('drops unknown enum values to undefined', () => {
      expect(
        normalizeChatToolbarState({
          permissionMode: 'godmode',
          reasoning: 'galaxy-brain',
          serviceTier: 'turbo',
          version: 1,
        }),
      ).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
    });

    test('drops non-string ids to undefined', () => {
      expect(
        normalizeChatToolbarState({
          modelId: 42,
          personaId: {},
          repositoryId: false,
          version: 1,
        }),
      ).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
    });

    test('keeps valid fields while repairing invalid siblings', () => {
      expect(
        normalizeChatToolbarState({
          modelId: 'cursor',
          reasoning: 'nonsense',
          version: 1,
        }),
      ).toEqual({
        ...DEFAULT_CHAT_TOOLBAR_STATE,
        modelId: 'cursor',
      });
    });
  });

  describe('perBackend coercion (v2)', () => {
    test('keeps valid per-backend entries', () => {
      const result = normalizeChatToolbarState({
        perBackend: {
          claude: { reasoning: ChatReasoningLevel.high },
          openai: { serviceTier: ChatServiceTier.fast },
        },
        version: CHAT_TOOLBAR_STATE_VERSION,
      });

      expect(result.perBackend).toEqual({
        claude: { reasoning: ChatReasoningLevel.high },
        openai: { serviceTier: ChatServiceTier.fast },
      });
    });

    test('drops unknown enum values within a per-backend entry', () => {
      const result = normalizeChatToolbarState({
        perBackend: {
          claude: {
            permissionMode: 'godmode',
            reasoning: ChatReasoningLevel.medium,
          },
        },
        version: CHAT_TOOLBAR_STATE_VERSION,
      });

      expect(result.perBackend).toEqual({
        claude: { reasoning: ChatReasoningLevel.medium },
      });
    });

    test('omits entries left with no valid prefs, and non-record entries', () => {
      const result = normalizeChatToolbarState({
        perBackend: {
          bogus: 'not-an-object',
          cursor: { reasoning: 'galaxy-brain' },
        },
        version: CHAT_TOOLBAR_STATE_VERSION,
      });

      expect(result.perBackend).toEqual({});
    });

    test('coerces a non-record perBackend to an empty map', () => {
      const result = normalizeChatToolbarState({
        perBackend: 'nope',
        version: CHAT_TOOLBAR_STATE_VERSION,
      });

      expect(result.perBackend).toEqual({});
    });
  });
});

describe('chatToolbarStateAtom localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  test('hydrates a valid persisted blob on module init', async () => {
    localStorage.setItem(
      CHAT_TOOLBAR_STORAGE_KEY,
      JSON.stringify({
        mode: ChatComposerMode.build,
        modelId: 'cursor',
        version: 1,
      }),
    );

    const { chatToolbarStateAtom } = await import('../atom.chat-toolbar');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(chatToolbarStateAtom)).toEqual({
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      mode: ChatComposerMode.build,
      modelId: 'cursor',
    });
  });

  test('hydrates an unknown-version blob as defaults on module init', async () => {
    localStorage.setItem(
      CHAT_TOOLBAR_STORAGE_KEY,
      JSON.stringify({ mode: ChatComposerMode.build, version: 99 }),
    );

    const { chatToolbarStateAtom } = await import('../atom.chat-toolbar');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(chatToolbarStateAtom)).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
  });

  test('persists updates under CHAT_TOOLBAR_STORAGE_KEY', async () => {
    const { chatToolbarStateAtom } = await import('../atom.chat-toolbar');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    store.set(chatToolbarStateAtom, {
      ...DEFAULT_CHAT_TOOLBAR_STATE,
      mode: ChatComposerMode.build,
      repositoryIds: ['repo-7'],
    });

    const raw = localStorage.getItem(CHAT_TOOLBAR_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed: {
      mode: string;
      repositoryIds: string[];
      version: number;
    } = JSON.parse(raw ?? '{}');
    expect(parsed.mode).toBe(ChatComposerMode.build);
    expect(parsed.repositoryIds).toEqual(['repo-7']);
    expect(parsed.version).toBe(CHAT_TOOLBAR_STATE_VERSION);
  });
});
