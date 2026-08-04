import type { RolloutFlagKind } from './catalog';

/**
 * One evaluated flag from the GraphQL `FeatureFlagObject` shape (injected
 * fetcher; package does not import app codegen).
 *
 * @public
 */
export type RolloutEvaluation = {
  readonly enabled: boolean;
  readonly key: string;
  readonly kind: RolloutFlagKind | string;
  readonly reason?: string;
  readonly valueJson: string;
  readonly variationIndex?: number;
};

/**
 * Arguments passed to the injected evaluation fetcher.
 *
 * @public
 */
export type RolloutFetchEvaluationsArgs = {
  readonly anonymousId?: string | null;
  readonly applicationKey: string;
};

/**
 * Injected adapter that loads evaluations (typically `evaluateFeatureFlags`).
 *
 * @public
 */
export type RolloutFetchEvaluations = (
  args: RolloutFetchEvaluationsArgs,
) => Promise<readonly RolloutEvaluation[]>;

/**
 * Where validated evaluation payloads are cached between mounts.
 *
 * @public
 */
export type RolloutCacheStorage = 'memory' | 'sessionStorage';

/**
 * Optional TTL cache for evaluation payloads keyed by application + identity.
 *
 * @public
 */
export type RolloutCacheOptions = {
  readonly storage?: RolloutCacheStorage;
  readonly ttlMs?: number;
};

/**
 * Provider hydration lifecycle (discriminated on `status`).
 *
 * @public
 */
export type RolloutHydrationState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready' }
  | { readonly error: Error; readonly status: 'error' };
