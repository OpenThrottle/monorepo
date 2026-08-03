export {
  assertRolloutFlagCatalog,
  defineRolloutFlags,
  isRolloutFlagKind,
  isRolloutFlagValueForKind,
  ROLLOUT_FLAG_KIND,
  type RolloutBooleanFlagKey,
  type RolloutFlagCatalog,
  type RolloutFlagCatalogInput,
  type RolloutFlagDefinition,
  type RolloutFlagDefinitionForKind,
  type RolloutFlagKey,
  type RolloutFlagKind,
  type RolloutFlagValue,
  type RolloutFlagValueByKind,
  type RolloutJsonValue,
} from './catalog';
export { RolloutProvider } from './components';
export type { RolloutProviderProps } from './components';
export {
  DEFAULT_ROLLOUT_CACHE_TTL_MS,
  ROLLOUT_CACHE_KEY_PREFIX,
} from './config';
export { RolloutContext } from './data';
export type { RolloutContextValue } from './data';
export {
  useIsRolloutEnabled,
  useRollout,
  useRolloutContext,
  useRolloutFlag,
} from './hooks';
export type {
  UseRolloutContextOptions,
  UseRolloutProviderOptions,
  UseRolloutResult,
} from './hooks';
export type {
  RolloutCacheOptions,
  RolloutCacheStorage,
  RolloutEvaluation,
  RolloutFetchEvaluations,
  RolloutFetchEvaluationsArgs,
  RolloutHydrationState,
} from './types';
export {
  clearRolloutEvaluationMemoryCache,
  defaultsFromCatalog,
  mergeRolloutEvaluations,
  parseRolloutValueJson,
  readRolloutEvaluationCache,
  writeRolloutEvaluationCache,
  type RolloutResolvedValues,
} from './utils';

/**
 * Package name constant (smoke / discoverability).
 *
 * @public
 */
export const REACT_ROUTER_ROLLOUT_PACKAGE =
  '@openthrottle/react-router-rollout' as const;
