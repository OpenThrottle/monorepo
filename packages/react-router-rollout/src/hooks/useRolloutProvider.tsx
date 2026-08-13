import * as React from 'react';

import type { RolloutFlagCatalog } from '../types';
import type { RolloutContextValue } from '../data';
import type {
  RolloutCacheOptions,
  RolloutEvaluation,
  RolloutFetchEvaluations,
  RolloutHydrationState,
} from '../types';
import {
  defaultsFromCatalog,
  mergeRolloutEvaluations,
  readRolloutEvaluationCache,
  writeRolloutEvaluationCache,
  type RolloutResolvedValues,
} from '../utils';

export interface UseRolloutProviderOptions<
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
> {
  readonly anonymousId?: string | null;
  readonly applicationKey: string;
  readonly cache?: RolloutCacheOptions;
  readonly fetchEvaluations: RolloutFetchEvaluations;
  readonly flags: TCatalog;
  readonly identityKey?: string | null;
  readonly initialEvaluations?: readonly RolloutEvaluation[];
  readonly strict?: boolean;
}

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

/**
 * Hydration state machine for {@link RolloutProvider}: cache → fetch → merge.
 *
 * @public
 */
export const useRolloutProvider = <TCatalog extends RolloutFlagCatalog>(
  options: UseRolloutProviderOptions<TCatalog>,
): RolloutContextValue<TCatalog> => {
  const {
    anonymousId,
    applicationKey,
    cache,
    fetchEvaluations,
    flags,
    identityKey,
    initialEvaluations,
    strict,
  } = options;
  const cacheStorage = cache?.storage;
  const cacheTtlMs = cache?.ttlMs;

  // Hooks
  const [values, setValues] = React.useState<RolloutResolvedValues<TCatalog>>(
    () =>
      initialEvaluations !== undefined
        ? mergeRolloutEvaluations(flags, initialEvaluations, {
            onWarn: () => undefined,
            strict,
          })
        : defaultsFromCatalog(flags),
  );
  const [hydration, setHydration] = React.useState<RolloutHydrationState>({
    status: 'idle',
  });
  const fetchRef = React.useRef(fetchEvaluations);
  const flagsRef = React.useRef(flags);
  const requestIdRef = React.useRef(0);

  // Setup
  fetchRef.current = fetchEvaluations;
  flagsRef.current = flags;

  // Handlers
  const applyEvaluations = React.useCallback(
    (evaluations: readonly RolloutEvaluation[]) => {
      setValues(
        mergeRolloutEvaluations(flagsRef.current, evaluations, { strict }),
      );
    },
    [strict],
  );

  const refresh = React.useCallback(async (): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setHydration({ status: 'loading' });

    const cacheOptions = {
      identityKey,
      storage: cacheStorage,
      ttlMs: cacheTtlMs,
    };

    const cached = readRolloutEvaluationCache(applicationKey, cacheOptions);
    if (cached !== undefined) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      applyEvaluations(cached.evaluations);
      setHydration({ status: 'ready' });
      return;
    }

    try {
      const evaluations = await fetchRef.current({
        anonymousId,
        applicationKey,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }
      writeRolloutEvaluationCache(applicationKey, evaluations, cacheOptions);
      applyEvaluations(evaluations);
      setHydration({ status: 'ready' });
    } catch (cause) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setValues(defaultsFromCatalog(flagsRef.current));
      setHydration({ error: toError(cause), status: 'error' });
    }
  }, [
    anonymousId,
    applicationKey,
    applyEvaluations,
    cacheStorage,
    cacheTtlMs,
    identityKey,
  ]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // 🔌 Short Circuit

  return {
    applicationKey,
    catalog: flags,
    hydration,
    refresh,
    values,
  };
};
