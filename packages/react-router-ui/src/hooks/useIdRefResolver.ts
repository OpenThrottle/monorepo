import {
  classifyIdInput,
  ID_INPUT_KIND,
  normalizeIdFragment,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import { EMPTY_ID_REF_MATCHES } from '../data/id-ref-resolver';
import type { IdRefMatch, IdRefResolverData } from '../types';

/**
 * @public
 */
export interface UseIdRefResolverOptions {
  /**
   * @description Latest data returned by the resolver transport (e.g. a
   * `useFetcher().data`). Surfaced as `matches` only when its `ref` matches the
   * current normalized query.
   */
  readonly data: IdRefResolverData | undefined;
  /**
   * @description Debounce between the last keystroke and invoking `load`.
   * Defaults to 250ms.
   */
  readonly debounceMs: number | undefined;
  /**
   * @description Triggers the lookup for a normalized hex `ref` (a short prefix
   * or all 32 hex of a UUID). Wire this to a resource-route fetch — GraphQL runs
   * server-side, so the palette cannot call `resolveIdRef` directly.
   */
  readonly load: (ref: string) => void;
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
export interface UseIdRefResolverResult {
  /**
   * @description True while a lookup for the current input is pending (debounce
   * scheduled or transport in flight) and fresh matches have not arrived.
   */
  readonly loading: boolean;
  /**
   * @description Resolved plan and task matches for the current input; empty when
   * the input is not an id or results have not arrived.
   */
  readonly matches: readonly IdRefMatch[];
}

/**
 * @public
 * @description Debounced id resolver for command palettes. When the query
 * classifies as a short hex fragment or a full UUID (via the shared
 * `classifyIdInput`), it debounces a call to `load` with the normalized hex and
 * surfaces the correlated `{ loading, matches }` across plans and tasks.
 * Non-id text is ignored, and matches for a stale ref are never shown.
 * Transport-agnostic, so any Commander consumer can reuse it with its own
 * resolver resource route.
 */
export function useIdRefResolver(
  options: UseIdRefResolverOptions,
): UseIdRefResolverResult {
  const { data, load, query, state } = options;

  // Hooks
  const [pending, setPending] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep `load` stable-referenced so the scheduling effect keys only on the
  // normalized ref, not on a new callback identity each render.
  const loadRef = React.useRef(load);

  // Setup
  const debounceMs = options.debounceMs ?? 250;

  const isId = classifyIdInput(query) !== ID_INPUT_KIND.NONE;
  const normalized = isId ? normalizeIdFragment(query) : '';

  const hasFreshData = data !== undefined && data.ref === normalized;
  const matches = isId && hasFreshData ? data.matches : EMPTY_ID_REF_MATCHES;
  const isInFlight = pending || state !== 'idle';
  const loading = isId && !hasFreshData && isInFlight;

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
