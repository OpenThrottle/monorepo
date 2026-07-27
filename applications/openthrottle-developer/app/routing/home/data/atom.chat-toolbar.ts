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
 */
export const CHAT_TOOLBAR_STATE_VERSION = 1 as const;

/** localStorage key for the persisted Chat Toolbar selections. */
export const CHAT_TOOLBAR_STORAGE_KEY = `${APP_NAME}:chat:toolbar`;

/**
 * The persisted Chat Toolbar selections for the developer-app home route.
 * Deliberately global (single object, implicit-default Jotai store) — per the
 * plan's V1 decision — mirroring the {@link configAtom} appearance precedent.
 * The id fields are `undefined` when unset so the route seeds them from loader
 * data; the enum fields are `undefined` when the user has made no explicit pick.
 * Keys are alphabetized; `version` stamps the schema for forward migration.
 */
export interface ChatToolbarState {
  readonly mode: ChatComposerMode;
  readonly modelId: string | undefined;
  readonly permissionMode: ChatPermissionMode | undefined;
  readonly personaId: string | undefined;
  readonly reasoning: ChatReasoningLevel | undefined;
  readonly repositoryId: string | undefined;
  readonly serviceTier: ChatServiceTier | undefined;
  readonly version: typeof CHAT_TOOLBAR_STATE_VERSION;
}

/**
 * Default = Plan mode, everything else unset. The route fills the absent id
 * fields from loader data (`models[0]`, `repositories[0]`, `personas[0]`) at
 * render time; reasoning/serviceTier/permissionMode stay unset until the user
 * chooses (and until the selected backend's capabilities allow them).
 */
export const DEFAULT_CHAT_TOOLBAR_STATE: ChatToolbarState = {
  mode: ChatComposerMode.plan,
  modelId: undefined,
  permissionMode: undefined,
  personaId: undefined,
  reasoning: undefined,
  repositoryId: undefined,
  serviceTier: undefined,
  version: CHAT_TOOLBAR_STATE_VERSION,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
 * Coerce a v1-shaped (or unversioned/legacy, which shares the v1 field set)
 * record into a valid {@link ChatToolbarState}: unknown enum values and
 * non-string ids drop back to their defaults rather than corrupting the blob.
 */
function coerceChatToolbarStateV1(
  record: Record<string, unknown>,
): ChatToolbarState {
  return {
    mode: isChatComposerMode(record.mode)
      ? record.mode
      : DEFAULT_CHAT_TOOLBAR_STATE.mode,
    modelId: typeof record.modelId === 'string' ? record.modelId : undefined,
    permissionMode: isChatPermissionMode(record.permissionMode)
      ? record.permissionMode
      : undefined,
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
 * absent → treated as v0) share the v1 field set today, so they migrate forward
 * while preserving still-valid picks. A newer/unknown version — or malformed
 * input — degrades to {@link DEFAULT_CHAT_TOOLBAR_STATE} rather than throwing.
 * The `switch` is the seam where a future v1→v2 reshape slots in as its own
 * case (rewriting `record` before the shared coercion).
 */
export function normalizeChatToolbarState(raw: unknown): ChatToolbarState {
  if (!isRecord(raw)) {
    return DEFAULT_CHAT_TOOLBAR_STATE;
  }

  const version = typeof raw.version === 'number' ? raw.version : 0;

  switch (version) {
    case 0:
    case CHAT_TOOLBAR_STATE_VERSION:
      return coerceChatToolbarStateV1(raw);
    default:
      // Newer/unknown schema written by a build we can't understand: don't
      // guess — fall back to defaults.
      return DEFAULT_CHAT_TOOLBAR_STATE;
  }
}

/**
 * SSR-guarded JSON storage that normalizes on read. On the server (no `window`)
 * it is a no-op store, so the atom hydrates to the default and the browser
 * re-reads localStorage on mount. No cross-tab `subscribe` — matches the
 * {@link configAtom} precedent (live cross-tab toolbar sync is deferred).
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
 */
export const chatToolbarStateAtom = atomWithStorage(
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
  createChatToolbarStorage(),
  { getOnInit: true },
);
