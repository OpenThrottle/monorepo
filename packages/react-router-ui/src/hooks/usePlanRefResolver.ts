import {
  classifyIdInput,
  ID_INPUT_KIND,
  normalizeIdFragment,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import { EMPTY_PLAN_REF_MATCHES } from '../data/data.plan-ref-resolver';
import type { PlanRefMatch, PlanRefResolverData } from '../types';

/**
 * @public
 */
export interface UsePlanRefResolverOptions {
  /**
   * @description Latest data returned by the resolver transport (e.g. a
   * `useFetcher().data`). Surfaced as `matches` only when its `prefix` matches
   * the current normalized query.
   */
  readonly data: PlanRefResolverData | undefined;
  /**
   * @description Debounce between the last keystroke and invoking {@link load}.
   */
  readonly debounceMs?: number;
  /**
   * @description Triggers the actual lookup for a normalized hex `prefix`. Wire
   * this to a resource-route fetch (e.g. `fetcher.load(...)`) — GraphQL for
   * `resolvePlanRef` runs server-side, so the palette cannot call it directly.
   */
  readonly load: (prefix: string) => void;
  /**
   * @description Current raw command-palette input.
   */
  readonly query: string;
  /**
   * @description Transport state (e.g. `useFetcher().state`); drives `loading`.
   */
  readonly state: 'idle' | 'loading' | 'submitting';
}

/**
 * @public
 */
export interface UsePlanRefResolverResult {
  /**
   * @description True while a lookup for the current fragment is pending (debounce
   * scheduled or transport in flight) and fresh matches have not yet arrived.
   */
  readonly loading: boolean;
  /**
   * @description Resolved matches for the current fragment; empty when the input
   * is not a resolvable short fragment or results have not arrived.
   */
  readonly matches: readonly PlanRefMatch[];
}

/**
 * @public
 * @description Debounced short-id-prefix resolver for command palettes. When the
 * query classifies as a short hex fragment (via the shared {@link classifyIdInput}),
 * it debounces a call to {@link UsePlanRefResolverOptions.load} with the normalized
 * prefix and surfaces the correlated `{ loading, matches }`. Full UUIDs and
 * non-id text are ignored (no lookup), and matches for a stale prefix are never
 * shown. Transport-agnostic so every Commander consumer (developer, admin, …)
 * can reuse it with its own resolver resource route.
 */
export function usePlanRefResolver(
  options: UsePlanRefResolverOptions,
): UsePlanRefResolverResult {
  const { data, load, query, state } = options;

  // Hooks
  const [pending, setPending] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep `load` stable-referenced so the scheduling effect keys only on the
  // normalized prefix, not on a new callback identity each render.
  const loadRef = React.useRef(load);

  // Setup
  const debounceMs = options.debounceMs ?? 250;

  const isFragment = classifyIdInput(query) === ID_INPUT_KIND.SHORT_FRAGMENT;
  const normalized = isFragment ? normalizeIdFragment(query) : '';

  const hasFreshData = data !== undefined && data.prefix === normalized;
  const matches =
    isFragment && hasFreshData ? data.matches : EMPTY_PLAN_REF_MATCHES;
  const loading =
    isFragment &&
    !hasFreshData &&
    (pending || state === 'loading' || state === 'submitting');

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    loadRef.current = load;
  }, [load]);

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (normalized.length === 0) {
      setPending(false);
      return;
    }

    setPending(true);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setPending(false);
      loadRef.current(normalized);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [debounceMs, normalized]);

  // 🔌 Short Circuit

  return { loading, matches };
}
