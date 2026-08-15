import { isRecord } from '@openthrottle/nodejs-utils';
import {
  DEFAULT_ROLLOUT_CACHE_TTL_MS,
  ROLLOUT_CACHE_KEY_PREFIX,
} from '../config';
import type {
  RolloutCacheOptions,
  RolloutCacheStorage,
  RolloutEvaluation,
} from '../types';

export type RolloutEvaluationCacheEntry = {
  readonly cachedAt: number;
  readonly evaluations: readonly RolloutEvaluation[];
};

const memoryStore = new Map<string, RolloutEvaluationCacheEntry>();

/**
 * Build a stable cache key for an application + optional actor identity.
 *
 * @public
 */
export const rolloutEvaluationCacheKey = (
  applicationKey: string,
  identityKey?: string | null,
): string =>
  `${ROLLOUT_CACHE_KEY_PREFIX}:${applicationKey}:${identityKey ?? 'anon'}`;

const isEvaluation = (value: unknown): value is RolloutEvaluation => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.key === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.valueJson === 'string' &&
    typeof value.enabled === 'boolean'
  );
};

const isCacheEntry = (value: unknown): value is RolloutEvaluationCacheEntry => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.cachedAt === 'number' &&
    Array.isArray(value.evaluations) &&
    value.evaluations.every(isEvaluation)
  );
};

const readSessionEntry = (
  key: string,
): RolloutEvaluationCacheEntry | undefined => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(raw);
    return isCacheEntry(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const writeSessionEntry = (
  key: string,
  entry: RolloutEvaluationCacheEntry,
): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // quota / private mode — ignore
  }
};

/**
 * Read a fresh evaluation cache entry when still within TTL.
 *
 * @public
 */
export const readRolloutEvaluationCache = (
  applicationKey: string,
  options: RolloutCacheOptions & {
    readonly identityKey?: string | null;
    readonly now?: number;
  } = {},
): RolloutEvaluationCacheEntry | undefined => {
  const storage: RolloutCacheStorage = options.storage ?? 'memory';
  const ttlMs = options.ttlMs ?? DEFAULT_ROLLOUT_CACHE_TTL_MS;
  const now = options.now ?? Date.now();
  const key = rolloutEvaluationCacheKey(applicationKey, options.identityKey);

  const entry =
    storage === 'sessionStorage' ? readSessionEntry(key) : memoryStore.get(key);

  if (entry === undefined) {
    return undefined;
  }

  if (now - entry.cachedAt > ttlMs) {
    return undefined;
  }

  return entry;
};

/**
 * Persist evaluations for the given application (+ identity) and storage backend.
 *
 * @public
 */
export const writeRolloutEvaluationCache = (
  applicationKey: string,
  evaluations: readonly RolloutEvaluation[],
  options: RolloutCacheOptions & {
    readonly identityKey?: string | null;
    readonly now?: number;
  } = {},
): void => {
  const storage: RolloutCacheStorage = options.storage ?? 'memory';
  const now = options.now ?? Date.now();
  const key = rolloutEvaluationCacheKey(applicationKey, options.identityKey);
  const entry: RolloutEvaluationCacheEntry = {
    cachedAt: now,
    evaluations: [...evaluations],
  };

  if (storage === 'sessionStorage') {
    writeSessionEntry(key, entry);
    return;
  }

  memoryStore.set(key, entry);
};

/**
 * Clear in-memory cache entries (tests).
 *
 * @public
 */
export const clearRolloutEvaluationMemoryCache = (): void => {
  memoryStore.clear();
};
