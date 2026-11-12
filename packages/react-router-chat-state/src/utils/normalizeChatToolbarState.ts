import { isRecord } from '@openthrottle/nodejs-utils';
import {
  ChatComposerMode,
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';

import type {
  ChatToolbarBackendPrefs,
  ChatToolbarState,
} from '../data/data.chat-toolbar-state';
import {
  CHAT_TOOLBAR_STATE_VERSION,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '../data/data.chat-toolbar-state';

/** True when `value` is one of the string members of an as-const union. */
function isMemberOf<T extends string>(
  members: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === 'string' && members.some((member) => member === value)
  );
}

const isChatComposerMode = (value: unknown): value is ChatComposerMode => {
  return isMemberOf(Object.values(ChatComposerMode), value);
};

const isChatPermissionMode = (value: unknown): value is ChatPermissionMode => {
  return isMemberOf(Object.values(ChatPermissionMode), value);
};

const isChatReasoningLevel = (value: unknown): value is ChatReasoningLevel => {
  return isMemberOf(Object.values(ChatReasoningLevel), value);
};

const isChatServiceTier = (value: unknown): value is ChatServiceTier => {
  return isMemberOf(Object.values(ChatServiceTier), value);
};

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
 * Coerce the persisted checkout selection into a primary-first id array.
 *
 * v4 writes `repositoryIds`; v3 and earlier wrote a single `repositoryId`, so a
 * legacy blob migrates forward as a one-element array rather than losing the
 * user's checkout. Non-string and empty entries are dropped and order is
 * preserved — index 0 is the primary, so reordering here would silently move
 * which repository the agent runs in.
 */
function coerceRepositoryIds(record: Record<string, unknown>): string[] {
  if (Array.isArray(record.repositoryIds)) {
    return record.repositoryIds.filter(
      (entry): entry is string => typeof entry === 'string' && entry !== '',
    );
  }

  // v3 and earlier.
  if (typeof record.repositoryId === 'string' && record.repositoryId !== '') {
    return [record.repositoryId];
  }

  return [];
}

/**
 * Coerce a persisted record into a valid {@link ChatToolbarState}: unknown enum
 * values and non-string ids drop back to their defaults rather than corrupting
 * the blob. v0-v3 share a forward-compatible field set — `perBackend` is
 * simply absent before v2, `persist` before v3, and v3's single `repositoryId`
 * widens to a one-element `repositoryIds` — so older blobs migrate forward
 * while preserving still-valid picks.
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
    // Absent before v5 → false, so the safety decay stays on unless the user
    // explicitly opted in. Anything but a real boolean true counts as off.
    rememberPermissionMode: record.rememberPermissionMode === true,
    repositoryIds: coerceRepositoryIds(record),
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
 * absent → treated as v0), v1 blobs (before `perBackend`), v2 blobs (before
 * `persist`), v3 blobs (single `repositoryId`) and v4 blobs (before
 * `rememberPermissionMode`, seeded false) all share a forward-compatible
 * field set, so they migrate forward — seeding `perBackend: {}`, `persist: true`
 * and widening `repositoryId` to `[id]` — while preserving still-valid picks (see {@link coerceChatToolbarState}). A newer/unknown version — or
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
    case 3:
    case 4:
    case CHAT_TOOLBAR_STATE_VERSION:
      return coerceChatToolbarState(raw);
    default:
      // Newer/unknown schema written by a build we can't understand: don't
      // guess — fall back to defaults.
      return DEFAULT_CHAT_TOOLBAR_STATE;
  }
}
