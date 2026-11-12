import type {
  ModelRoutingPolicy,
  RouteTaskModelResult,
} from '../contract/index.ts';

export interface RouteTaskModelInput {
  /** `tasks.category`; null or blank routes to the default tier. */
  readonly category: string | null;
  /** Model ids the run's driver accepts; empty when it lists none. */
  readonly driverModels: readonly string[];
  readonly policy: ModelRoutingPolicy;
  /** The run's configured model; used (and recorded) on any fallback. */
  readonly runModel: string | undefined;
}

/**
 * @description Routes one task: lower-cased category, then tier, then a model the driver lists.
 * The tier's `recordAs` id is preferred and its `agentModel` alias is the second candidate, so a
 * driver that lists aliases (claude) still routes. A tier that is not auto-routable, a driver that
 * lists nothing, or a tier with no valid model falls back to the run's model.
 * @public
 */
export const routeTaskModel = (
  input: RouteTaskModelInput,
): RouteTaskModelResult => {
  const { category, driverModels, policy, runModel } = input;
  const key = category === null ? '' : category.trim().toLowerCase();
  const tierName = policy.categories.get(key) ?? policy.defaultTier;
  const tier = policy.tiers.get(tierName);

  if (tier === undefined || tier.neverAutoRouted) {
    return {
      kind: 'fallback',
      model: runModel,
      reason: 'tier_not_auto_routable',
      tier: tierName,
    };
  }

  if (driverModels.length === 0) {
    return {
      kind: 'fallback',
      model: runModel,
      reason: 'driver_models_unavailable',
      tier: tierName,
    };
  }

  const model = [tier.recordAs, tier.agentModel].find((candidate) =>
    driverModels.includes(candidate),
  );

  if (model === undefined) {
    return {
      kind: 'fallback',
      model: runModel,
      reason: 'model_not_valid_for_driver',
      tier: tierName,
    };
  }

  return { kind: 'routed', model, tier: tierName };
};
