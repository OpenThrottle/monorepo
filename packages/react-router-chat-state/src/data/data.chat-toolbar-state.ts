import type {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import { ChatComposerMode } from '@openthrottle/react-router-chat';
import { APP_NAME } from '@openthrottle/react-router-utils';

/**
 * Schema version stamped into the persisted blob. Bump this whenever
 * {@link ChatToolbarState} changes shape so `normalizeChatToolbarState`
 * can migrate old blobs forward instead of wiping the user's saved toolbar.
 * @public
 */
export const CHAT_TOOLBAR_STATE_VERSION = 4 as const;

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
  /**
   * Selected checkouts, PRIMARY FIRST — index 0 is the repository the agent
   * process runs in, the rest are additional granted context directories.
   * Replaced the single `repositoryId` in v4; empty means nothing chosen yet,
   * which the consumer seeds from loader data.
   */
  readonly repositoryIds: readonly string[];
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
  repositoryIds: [],
  serviceTier: undefined,
  version: CHAT_TOOLBAR_STATE_VERSION,
};
