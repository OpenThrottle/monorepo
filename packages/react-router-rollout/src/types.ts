import type { RolloutFlagKind } from './config/rollout-flag-kind';

/**
 * JSON-serializable values for `kind = json`.
 * Runtime defaults must be plain objects or arrays (aligned with nestjs-rollout).
 *
 * @public
 */
export type RolloutJsonValue =
  | boolean
  | number
  | string
  | null
  | RolloutJsonValue[]
  | { readonly [key: string]: RolloutJsonValue };

/**
 * Maps a declared kind to the TypeScript type of `defaultValue` / resolved value.
 *
 * @public
 */
export type RolloutFlagValueByKind = {
  boolean: boolean;
  json: RolloutJsonValue;
  number: number;
  string: string;
};

/**
 * One catalog entry for a specific kind.
 *
 * @public
 */
export type RolloutFlagDefinitionForKind<TKey extends RolloutFlagKind> = {
  readonly defaultValue: RolloutFlagValueByKind[TKey];
  readonly kind: TKey;
};

/**
 * Discriminated catalog entry (any supported kind).
 *
 * @public
 */
export type RolloutFlagDefinition =
  | RolloutFlagDefinitionForKind<'boolean'>
  | RolloutFlagDefinitionForKind<'json'>
  | RolloutFlagDefinitionForKind<'number'>
  | RolloutFlagDefinitionForKind<'string'>;

/**
 * Client flag catalog: key → kind + defaultValue.
 *
 * @public
 */
export type RolloutFlagCatalog = {
  readonly [key: string]: RolloutFlagDefinition;
};

/**
 * Keys declared in a catalog.
 *
 * @public
 */
export type RolloutFlagKey<TCatalog extends RolloutFlagCatalog> =
  keyof TCatalog & string;

/**
 * Resolved value type for a catalog key (from declared `kind`, not the default literal).
 *
 * @public
 */
export type RolloutFlagValue<
  TCatalog extends RolloutFlagCatalog,
  TKey extends RolloutFlagKey<TCatalog>,
> = RolloutFlagValueByKind[TCatalog[TKey]['kind']];

/**
 * Catalog keys whose kind is `boolean` (for `useIsRolloutEnabled`).
 *
 * @public
 */
export type RolloutBooleanFlagKey<TCatalog extends RolloutFlagCatalog> = {
  [TKey in RolloutFlagKey<TCatalog>]: TCatalog[TKey]['kind'] extends 'boolean'
    ? TKey
    : never;
}[RolloutFlagKey<TCatalog>];

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
