/**
 * Types for per-task model routing (docs/workflows/ot-loop-job.md § 8,
 * docs/openthrottle/per-task-model-routing.md). The data is `model-routing.json`; nothing here
 * holds a copy of it.
 */

/** @public */
export interface ModelRoutingTier {
  /** The driver-facing alias (a Claude Code Agent-tool alias such as `sonnet`). */
  readonly agentModel: string;
  readonly neverAutoRouted: boolean;
  /** The model id the policy declares to attribution. */
  readonly recordAs: string;
}

/** @public */
export interface ModelRoutingPolicy {
  /** Lower-cased category to tier name. */
  readonly categories: ReadonlyMap<string, string>;
  readonly defaultTier: string;
  readonly tiers: ReadonlyMap<string, ModelRoutingTier>;
}

/** @public */
export type ModelRoutingPolicyResult =
  | { readonly kind: 'invalid'; readonly reason: string }
  | { readonly kind: 'ok'; readonly policy: ModelRoutingPolicy };

/** @public */
export type ModelRoutingFallbackReason =
  | 'driver_models_unavailable'
  | 'model_not_valid_for_driver'
  | 'tier_not_auto_routable';

/**
 * @description The routed model: `routed` when a tier's model is valid for the run's driver,
 * `fallback` when the run's configured model is used instead. `model` is exactly what is passed to
 * the driver and recorded on the work session.
 * @public
 */
export type RouteTaskModelResult =
  | {
      readonly kind: 'fallback';
      readonly model: string | undefined;
      readonly reason: ModelRoutingFallbackReason;
      readonly tier: string;
    }
  | {
      readonly kind: 'routed';
      readonly model: string;
      readonly tier: string;
    };

/**
 * @description Lists the model ids the run's driver accepts (its `discoverModels` result).
 * @public
 */
export type DriverModelLister = () => Promise<readonly string[]>;
