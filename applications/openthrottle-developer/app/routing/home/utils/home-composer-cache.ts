import { isRecord } from '@openthrottle/nodejs-utils';
import {
  AGENT_CONVERSATIONS_ACTION,
  CONVERSATION_STREAM_ACTION,
} from '@openthrottle/react-router-chat';

import type {
  loadComposerData,
  loadDefaultAgent,
  loadPersonas,
  loadRepositories,
} from '~/routing/home/utils/models.server';

/**
 * @description Client-side freshness cache for the `/` (home chat) route's
 * composer discovery bundle — models, agent CLIs, repositories, personas and
 * the default agent. The route's `clientLoader` serves a fresh entry instead of
 * calling the server loader, so returning to `/` (or a chat-turn fetcher
 * revalidating it) does not re-run discovery for five minutes. Same two-layer
 * shape as the header chat's `chat-options-cache.ts` — module scope backed by
 * `sessionStorage` — but deliberately a separate key and TTL: the five-minute
 * window is scoped to this route only. Only non-empty discoveries are cached,
 * so a failed scan never hides a model server that has since come up.
 */

const STORAGE_KEY = 'openthrottle.home-composer.v1';

/** Freshness window for the home route's composer cache (ms). */
export const HOME_COMPOSER_CACHE_TTL_MS = 300_000;

type ComposerDiscovery = Awaited<ReturnType<typeof loadComposerData>>;

/** The resolved bundle the `/` loader streams as `composerData`. */
export interface HomeComposerData {
  readonly agentRuntimes: ComposerDiscovery['agentRuntimes'];
  readonly defaultAgent: Awaited<ReturnType<typeof loadDefaultAgent>>;
  readonly models: ComposerDiscovery['models'];
  readonly personas: Awaited<ReturnType<typeof loadPersonas>>;
  readonly repositories: Awaited<ReturnType<typeof loadRepositories>>;
}

interface CachedHomeComposer {
  readonly data: HomeComposerData;
  readonly storedAt: number;
}

let memoryEntry: CachedHomeComposer | null = null;
/** The server load currently in flight, shared by concurrent client loads. */
let inFlight: Promise<HomeComposerData> | null = null;
/** Bumped by every clear, so a load that started before it never writes. */
let generation = 0;

/** Structural guard so a tampered/legacy `sessionStorage` blob is ignored. */
function isCachedHomeComposer(value: unknown): value is CachedHomeComposer {
  if (!isRecord(value) || typeof value.storedAt !== 'number') {
    return false;
  }
  if (!isRecord(value.data)) {
    return false;
  }

  return (
    isRecord(value.data.agentRuntimes) &&
    (value.data.defaultAgent === null || isRecord(value.data.defaultAgent)) &&
    Array.isArray(value.data.models) &&
    Array.isArray(value.data.personas) &&
    Array.isArray(value.data.repositories)
  );
}

/** A discovery that found nothing is never cached (it may be a transient failure). */
function hasDiscoveredSomething(data: HomeComposerData): boolean {
  return data.models.length > 0 || Object.keys(data.agentRuntimes).length > 0;
}

function readFromSession(): CachedHomeComposer | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isCachedHomeComposer(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeToSession(entry: CachedHomeComposer): void {
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
 * Return the cached composer bundle when a non-expired entry exists, else
 * `null`. Reads the module-scope layer first, falling back to (and rehydrating
 * from) `sessionStorage`.
 */
export function readHomeComposerCache(
  ttlMs: number = HOME_COMPOSER_CACHE_TTL_MS,
): HomeComposerData | null {
  const entry = memoryEntry ?? readFromSession();
  if (entry === null || Date.now() - entry.storedAt >= ttlMs) {
    return null;
  }

  memoryEntry = entry;
  return entry.data;
}

/** Persist a resolved bundle to both layers; an empty discovery is skipped. */
export function writeHomeComposerCache(data: HomeComposerData): void {
  if (!hasDiscoveredSomething(data)) {
    return;
  }

  const entry: CachedHomeComposer = { data, storedAt: Date.now() };
  memoryEntry = entry;
  writeToSession(entry);
}

/**
 * Run `load` and cache its bundle once it resolves, sharing the in-flight
 * promise so a revalidation that fires mid-load (e.g. the conversation list's
 * mount-time POST) joins it instead of starting a second fetch. A clear that
 * lands while the load is in flight stops it from writing the cache.
 */
function trackHomeComposerLoad(
  load: () => Promise<HomeComposerData>,
): Promise<HomeComposerData> {
  const startedAt = generation;
  const tracked = load()
    .then((data) => {
      if (startedAt === generation) {
        writeHomeComposerCache(data);
      }
      return data;
    })
    .finally(() => {
      if (inFlight === tracked) {
        inFlight = null;
      }
    });

  inFlight = tracked;
  return tracked;
}

/**
 * The `/` route's client load: a fresh cached bundle if there is one, else the
 * load already in flight, else a new tracked `load`. Always a promise, so the
 * route keeps streaming and the shell paints first.
 */
export function loadHomeComposer(
  load: () => Promise<HomeComposerData>,
): Promise<HomeComposerData> {
  const cached = readHomeComposerCache();
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return inFlight ?? trackHomeComposerLoad(load);
}

/** Drop both cache layers (a composer-affecting mutation, or test isolation). */
export function clearHomeComposerCache(): void {
  generation += 1;
  inFlight = null;
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

/**
 * Whether a submission to `formAction` leaves the composer bundle untouched.
 * Chat turns and conversation-list edits post to these resource actions on
 * every message; they never change models, repositories or personas, so they
 * must not invalidate the cache.
 */
export function isComposerNeutralAction(
  formAction: string | undefined,
): boolean {
  if (formAction === undefined) {
    return false;
  }

  const pathname = formAction.split('?')[0];

  return (
    pathname === CONVERSATION_STREAM_ACTION ||
    pathname === AGENT_CONVERSATIONS_ACTION
  );
}
