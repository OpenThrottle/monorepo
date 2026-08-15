import { isRecord } from '@openthrottle/nodejs-utils';
import { APP_NAME } from '@openthrottle/react-router-utils';
import {
  ChatComposerMode,
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

/**
 * Schema version stamped into the persisted blob. Bump this whenever
 * {@link ChatToolbarState} changes shape so {@link normalizeChatToolbarState}
 * can migrate old blobs forward instead of wiping the user's saved toolbar.
 * @public
 */
export const CHAT_TOOLBAR_STATE_VERSION = 3 as const;

/**
 * localStorage key for the persisted Chat Toolbar selections. Derived from
 * `APP_NAME` at RUNTIME (via window.env / process.env), so the single shared
 * atom module namespaces per consuming app (developer vs admin) automatically.
 * @public
 */
export const CHAT_TOOLBAR_STORAGE_KEY = `${APP_NAME}:chat:toolbar`;

/**
 * Per-backend memory of the capability-gated toolbar controls. Keyed in
 * {@link ChatToolbarState.perBackend} by `decodeChatOption(modelId).backend`
 * (the CLI driver token, or `openai` for local endpoints), so each backend
 * restores its own last-used picks. Every field is optional; an absent field
 * falls back to the top-level global on that state (see the reconciler).
 * @public
 */
export interface ChatToolbarBackendPrefs {
  readonly permissionMode?: ChatPermissionMode;
  readonly reasoning?: ChatReasoningLevel;
  readonly serviceTier?: ChatServiceTier;
}

/**
 * The persisted Chat Toolbar selections. Deliberately global (single object,
 * implicit-default Jotai store), mirroring the appearance-config precedent. The
 * id fields are `undefined` when unset so the consumer seeds them from loader
 * data; the enum fields are `undefined` when the user has made no explicit pick.
 * The top-level `permissionMode`/`reasoning`/`serviceTier` act as the GLOBAL
 * fallback; `perBackend` (added in v2) holds per-backend OVERRIDES layered over
 * them. Keys are alphabetized; `version` stamps the schema for forward migration.
 * @public
 */
export interface ChatToolbarState {
  readonly mode: ChatComposerMode;
  readonly modelId: string | undefined;
  readonly perBackend: Readonly<Record<string, ChatToolbarBackendPrefs>>;
  readonly permissionMode: ChatPermissionMode | undefined;
  /**
   * When true (default) turns are persisted to a conversation; false is Private
   * mode (ephemeral — no conversation row, no message writes). Added in v3;
   * always available regardless of backend, so it is never capability-gated.
   */
  readonly persist: boolean;
  readonly personaId: string | undefined;
  readonly reasoning: ChatReasoningLevel | undefined;
  readonly repositoryId: string | undefined;
  readonly serviceTier: ChatServiceTier | undefined;
  readonly version: typeof CHAT_TOOLBAR_STATE_VERSION;
}

/**
 * Default = Plan mode, everything else unset. The consumer fills the absent id
 * fields from loader data (`models[0]`, `repositories[0]`, `personas[0]`) at
 * render time; reasoning/serviceTier/permissionMode stay unset until the user
 * chooses (and until the selected backend's capabilities allow them).
 * @public
 */
export const DEFAULT_CHAT_TOOLBAR_STATE: ChatToolbarState = {
  mode: ChatComposerMode.plan,
  modelId: undefined,
  perBackend: {},
  permissionMode: undefined,
  persist: true,
  personaId: undefined,
  reasoning: undefined,
  repositoryId: undefined,
  serviceTier: undefined,
  version: CHAT_TOOLBAR_STATE_VERSION,
};

/** True when `value` is one of the string members of an as-const union. */
function isMemberOf<T extends string>(
  members: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === 'string' && members.some((member) => member === value)
  );
}

const isChatComposerMode = (value: unknown): value is ChatComposerMode =>
  isMemberOf(Object.values(ChatComposerMode), value);

const isChatPermissionMode = (value: unknown): value is ChatPermissionMode =>
  isMemberOf(Object.values(ChatPermissionMode), value);

const isChatReasoningLevel = (value: unknown): value is ChatReasoningLevel =>
  isMemberOf(Object.values(ChatReasoningLevel), value);

const isChatServiceTier = (value: unknown): value is ChatServiceTier =>
  isMemberOf(Object.values(ChatServiceTier), value);

/**
 * Coerce an unknown persisted `perBackend` map into a valid record: non-record
 * entries and unknown enum values are dropped, and any entry left with no valid
 * prefs is omitted entirely so the map never accumulates empty keys.
 */
function coercePerBackend(
  value: unknown,
): Record<string, ChatToolbarBackendPrefs> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, ChatToolbarBackendPrefs> = {};
  for (const [backendKey, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue;
    }

    const prefs: {
      permissionMode?: ChatPermissionMode;
      reasoning?: ChatReasoningLevel;
      serviceTier?: ChatServiceTier;
    } = {};
    if (isChatPermissionMode(entry.permissionMode)) {
      prefs.permissionMode = entry.permissionMode;
    }
    if (isChatReasoningLevel(entry.reasoning)) {
      prefs.reasoning = entry.reasoning;
    }
    if (isChatServiceTier(entry.serviceTier)) {
      prefs.serviceTier = entry.serviceTier;
    }

    if (
      prefs.permissionMode !== undefined ||
      prefs.reasoning !== undefined ||
      prefs.serviceTier !== undefined
    ) {
      result[backendKey] = prefs;
    }
  }

  return result;
}

/**
 * Coerce a persisted record into a valid {@link ChatToolbarState}: unknown enum
 * values and non-string ids drop back to their defaults rather than corrupting
 * the blob. v0/v1/v2 share a forward-compatible field set — `perBackend` is
 * simply absent before v2, so it coerces to `{}` and the older blob migrates
 * forward while preserving still-valid picks.
 */
function coerceChatToolbarState(
  record: Record<string, unknown>,
): ChatToolbarState {
  return {
    mode: isChatComposerMode(record.mode)
      ? record.mode
      : DEFAULT_CHAT_TOOLBAR_STATE.mode,
    modelId: typeof record.modelId === 'string' ? record.modelId : undefined,
    perBackend: coercePerBackend(record.perBackend),
    permissionMode: isChatPermissionMode(record.permissionMode)
      ? record.permissionMode
      : undefined,
    // Absent before v3 → default true, so older blobs migrate forward as
    // persist-on (the default). Only an explicit `false` opts into Private mode.
    persist: typeof record.persist === 'boolean' ? record.persist : true,
    personaId:
      typeof record.personaId === 'string' ? record.personaId : undefined,
    reasoning: isChatReasoningLevel(record.reasoning)
      ? record.reasoning
      : undefined,
    repositoryId:
      typeof record.repositoryId === 'string' ? record.repositoryId : undefined,
    serviceTier: isChatServiceTier(record.serviceTier)
      ? record.serviceTier
      : undefined,
    version: CHAT_TOOLBAR_STATE_VERSION,
  };
}

/**
 * @description Migration-aware coercion of unknown persisted JSON into a valid
 * {@link ChatToolbarState}. Reads `version`, dispatches to the matching
 * migration, then coerces each field. Unversioned/legacy blobs (`version`
 * absent → treated as v0), v1 blobs (before `perBackend`), and v2 blobs (before
 * `persist`) all share a forward-compatible field set, so they migrate forward —
 * seeding `perBackend: {}` and `persist: true` — while preserving still-valid
 * picks (see {@link coerceChatToolbarState}). A newer/unknown version — or
 * malformed input — degrades to {@link DEFAULT_CHAT_TOOLBAR_STATE} rather than
 * throwing. The `switch` is the seam where a future reshape slots in as its own
 * case (rewriting `record` before the shared coercion).
 * @public
 */
export function normalizeChatToolbarState(raw: unknown): ChatToolbarState {
  if (!isRecord(raw)) {
    return DEFAULT_CHAT_TOOLBAR_STATE;
  }

  const version = typeof raw.version === 'number' ? raw.version : 0;

  switch (version) {
    case 0:
    case 1:
    case 2:
    case CHAT_TOOLBAR_STATE_VERSION:
      return coerceChatToolbarState(raw);
    default:
      // Newer/unknown schema written by a build we can't understand: don't
      // guess — fall back to defaults.
      return DEFAULT_CHAT_TOOLBAR_STATE;
  }
}

/**
 * SSR-guarded JSON storage that normalizes on read. On the server (no `window`)
 * it is a no-op store, so the atom hydrates to the default and the browser
 * re-reads localStorage on mount. No cross-tab `subscribe` — live cross-tab
 * toolbar sync is deferred.
 */
const createChatToolbarStorage = (): SyncStorage<ChatToolbarState> => {
  const jsonStorage = createJSONStorage<ChatToolbarState>(() => {
    if (typeof window === 'undefined') {
      return {
        getItem: () => null,
        removeItem: () => {},
        setItem: () => {},
        subscribe: () => () => {},
      };
    }
    return localStorage;
  });

  return {
    ...jsonStorage,
    getItem: (key, initialValue) => {
      const raw = jsonStorage.getItem(key, initialValue);
      return normalizeChatToolbarState(raw);
    },
  };
};

/**
 * Global, localStorage-backed atom holding the persisted Chat Toolbar
 * selections. `getOnInit` hydrates synchronously from storage so the toolbar
 * renders the saved values on first paint (client-side).
 * @public
 */
export const chatToolbarStateAtom = atomWithStorage(
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
  createChatToolbarStorage(),
  { getOnInit: true },
);
