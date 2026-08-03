import type { RolloutFlagKind } from './rollout-flag-kind';

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
export type RolloutFlagDefinitionForKind<K extends RolloutFlagKind> = {
  readonly defaultValue: RolloutFlagValueByKind[K];
  readonly kind: K;
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
  K extends RolloutFlagKey<TCatalog>,
> = RolloutFlagValueByKind[TCatalog[K]['kind']];

/**
 * Catalog keys whose kind is `boolean` (for `useIsRolloutEnabled`).
 *
 * @public
 */
export type RolloutBooleanFlagKey<TCatalog extends RolloutFlagCatalog> = {
  [K in RolloutFlagKey<TCatalog>]: TCatalog[K]['kind'] extends 'boolean'
    ? K
    : never;
}[RolloutFlagKey<TCatalog>];
