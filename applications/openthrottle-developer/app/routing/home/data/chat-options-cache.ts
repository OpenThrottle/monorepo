import { isRecord } from '@openthrottle/nodejs-utils';

import type { ChatOptionsResponse } from '@openthrottle/react-router-chat-state';

/**
 * @description Client-side freshness cache for the header chat's discovery
 * options (`/resources/chat-options`). The global header ChatDialog mounts on
 * every route, so without this each mount / full reload re-issues the discovery
 * queries. A two-layer cache — module-scope (survives component remounts within
 * the SPA session) backed by `sessionStorage` (survives a full reload within the
 * tab) — lets a warm mount reuse the last good result and skip the probe while
 * it is fresh. Only non-empty results are cached (a failed/empty scan is never
 * persisted, so it can't hide a now-working discovery), and expiry falls back to
 * a fresh fetch — the server's own stale-while-revalidate handles the rest.
 */

const STORAGE_KEY = 'openthrottle.chat-options.v1';

/** Default freshness window for the client-side discovery cache (ms). */
export const CHAT_OPTIONS_CACHE_TTL_MS = 60_000;

interface CachedChatOptions {
  readonly data: ChatOptionsResponse;
  readonly storedAt: number;
}

let memoryEntry: CachedChatOptions | null = null;

/** Structural guard so a tampered/legacy `sessionStorage` blob is ignored. */
function isCachedChatOptions(value: unknown): value is CachedChatOptions {
  if (!isRecord(value) || typeof value.storedAt !== 'number') {
    return false;
  }
  if (!isRecord(value.data)) {
    return false;
  }

  return (
    Array.isArray(value.data.models) &&
    Array.isArray(value.data.personas) &&
    Array.isArray(value.data.repositories)
  );
}

function readFromSession(): CachedChatOptions | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isCachedChatOptions(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeToSession(entry: CachedChatOptions): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Quota/security errors are non-fatal — the in-memory layer still serves.
  }
}

/**
 * Return the cached discovery options when a non-expired entry exists, else
 * `null`. Reads the module-scope layer first, falling back to (and rehydrating
 * from) `sessionStorage`.
 */
export function readChatOptionsCache(
  ttlMs: number = CHAT_OPTIONS_CACHE_TTL_MS,
): ChatOptionsResponse | null {
  const entry = memoryEntry ?? readFromSession();
  if (entry === null || Date.now() - entry.storedAt >= ttlMs) {
    return null;
  }

  memoryEntry = entry;
  return entry.data;
}

/** Persist a fresh discovery result to both cache layers. */
export function writeChatOptionsCache(data: ChatOptionsResponse): void {
  const entry: CachedChatOptions = { data, storedAt: Date.now() };
  memoryEntry = entry;
  writeToSession(entry);
}

/** Drop both cache layers (e.g. an explicit refresh, or test isolation). */
export function clearChatOptionsCache(): void {
  memoryEntry = null;
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal — the module-scope layer is already cleared.
  }
}
