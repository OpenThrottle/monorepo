import * as React from 'react';
import {
  classifyIdInput,
  ID_INPUT_KIND,
  normalizeIdFragment,
} from '@openthrottle/react-router-utils';

const DEFAULT_DEBOUNCE_MS = 250;

const EMPTY_MATCHES: readonly PlanRefMatch[] = [];

/**
 * @public
 * @description A minimal plan reference returned by the `resolvePlanRef` query
 * (mirrors the server `PlanRefObject`). Enough to render a confident ⌘K redirect
 * row and resolve a short fragment to its full id.
 */
export interface PlanRefMatch {
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * @public
 * @description Payload a resolver resource route returns for a lookup. `prefix`
 * echoes the normalized fragment the matches were resolved for, so the hook can
 * ignore data that belongs to a stale keystroke.
 */
export interface PlanRefResolverData {
  readonly matches: readonly PlanRefMatch[];
  readonly prefix: string;
}

/**
 * @public
 */
export interface UsePlanRefResolverArgs {
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
 * it debounces a call to {@link UsePlanRefResolverArgs.load} with the normalized
 * prefix and surfaces the correlated `{ loading, matches }`. Full UUIDs and
 * non-id text are ignored (no lookup), and matches for a stale prefix are never
 * shown. Transport-agnostic so every Commander consumer (developer, admin, …)
 * can reuse it with its own resolver resource route.
 */
export function usePlanRefResolver(
  args: UsePlanRefResolverArgs,
): UsePlanRefResolverResult {
  const { data, load, query, state } = args;
  const debounceMs = args.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const isFragment = classifyIdInput(query) === ID_INPUT_KIND.SHORT_FRAGMENT;
  const normalized = isFragment ? normalizeIdFragment(query) : '';

  const [pending, setPending] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep `load` stable-referenced so the scheduling effect keys only on the
  // normalized prefix, not on a new callback identity each render.
  const loadRef = React.useRef(load);
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

  const hasFreshData = data !== undefined && data.prefix === normalized;
  const matches = isFragment && hasFreshData ? data.matches : EMPTY_MATCHES;
  const loading =
    isFragment &&
    !hasFreshData &&
    (pending || state === 'loading' || state === 'submitting');

  return { loading, matches };
}
