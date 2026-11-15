/** Who may reuse a cached response: anyone, or only the requesting user. */
export type CacheHintScope = 'PRIVATE' | 'PUBLIC';

/** A per-field cache hint, as Apollo's cache-control plugin accepts it. */
export interface CacheHint {
  /** Seconds the field's value may be served from a cache. */
  readonly maxAge: number;
  readonly scope: CacheHintScope;
}

/**
 * The slice of Apollo's `info.cacheControl` this package relies on. Present
 * only when the cache-control plugin is installed.
 */
export interface ResolveInfoCacheControl {
  readonly setCacheHint: (hint: CacheHint) => void;
}
