export type { RolloutProviderProps } from './components';
export { RolloutProvider } from './components';
export {
  DEFAULT_ROLLOUT_CACHE_TTL_MS,
  isRolloutFlagKind,
  ROLLOUT_CACHE_KEY_PREFIX,
  ROLLOUT_FLAG_KIND,
  type RolloutFlagKind,
} from './config';
export type { RolloutContextValue } from './data';
export { RolloutContext } from './data';
export type {
  UseRolloutContextOptions,
  UseRolloutProviderOptions,
  UseRolloutResult,
} from './hooks';
export {
  useIsRolloutEnabled,
  useRollout,
  useRolloutContext,
  useRolloutFlag,
} from './hooks';
export type {
  RolloutBooleanFlagKey,
  RolloutCacheOptions,
  RolloutCacheStorage,
  RolloutEvaluation,
  RolloutFetchEvaluations,
  RolloutFetchEvaluationsArgs,
  RolloutFlagCatalog,
  RolloutFlagDefinition,
  RolloutFlagDefinitionForKind,
  RolloutFlagKey,
  RolloutFlagValue,
  RolloutFlagValueByKind,
  RolloutHydrationState,
  RolloutJsonValue,
} from './types';
export {
  assertRolloutFlagCatalog,
  clearRolloutEvaluationMemoryCache,
  defaultsFromCatalog,
  defineRolloutFlags,
  isRolloutFlagValueForKind,
  mergeRolloutEvaluations,
  parseRolloutValueJson,
  readRolloutEvaluationCache,
  type RolloutFlagCatalogInput,
  type RolloutResolvedValues,
  writeRolloutEvaluationCache,
} from './utils';

/**
 * Package name constant (smoke / discoverability).
 *
 * @public
 */
export const REACT_ROUTER_ROLLOUT_PACKAGE =
  '@openthrottle/react-router-rollout' as const;
