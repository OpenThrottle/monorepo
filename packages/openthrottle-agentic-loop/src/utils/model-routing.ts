import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  DriverModelLister,
  LoopTask,
  ModelRoutingPolicy,
  ModelRoutingPolicyResult,
  ModelRoutingTier,
  RouteTaskModelResult,
} from '../contract/index.ts';
import {
  MODEL_ROUTING_DEFAULT_TIER,
  MODEL_ROUTING_POLICY_RELATIVE_PATH,
  MODEL_ROUTING_POLICY_VERSION,
  MODEL_ROUTING_REVIEW_TIER,
} from '../data/data.model-routing.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const invalid = (reason: string): ModelRoutingPolicyResult => {
  return { kind: 'invalid', reason };
};

const parseTier = (value: unknown): ModelRoutingTier | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const { agentModel, neverAutoRouted, recordAs } = value;

  if (
    typeof agentModel !== 'string' ||
    agentModel.trim() === '' ||
    typeof recordAs !== 'string' ||
    recordAs.trim() === ''
  ) {
    return undefined;
  }

  return {
    agentModel,
    neverAutoRouted: neverAutoRouted === true,
    recordAs,
  };
};

/**
 * @description Schema-checks parsed `model-routing.json`. Rejects a policy whose `default` tier is
 * missing, whose category points at an unknown tier, or whose category reaches the `review` tier
 * (or any `neverAutoRouted` tier), so the cost guardrail cannot be loaded away.
 * @public
 */
export const parseModelRoutingPolicy = (
  raw: unknown,
): ModelRoutingPolicyResult => {
  if (!isRecord(raw)) {
    return invalid(`model routing policy must be a JSON object`);
  }

  if (raw['version'] !== MODEL_ROUTING_POLICY_VERSION) {
    return invalid(
      `unsupported model routing policy version: ${String(raw['version'])}`,
    );
  }

  const rawTiers = raw['tiers'];
  const rawCategories = raw['categories'];

  if (!isRecord(rawTiers) || !isRecord(rawCategories)) {
    return invalid(`model routing policy needs "tiers" and "categories"`);
  }

  const tiers = new Map<string, ModelRoutingTier>();

  for (const [name, value] of Object.entries(rawTiers)) {
    const tier = parseTier(value);

    if (tier === undefined) {
      return invalid(`tier "${name}" needs non-empty agentModel and recordAs`);
    }

    tiers.set(name, tier);
  }

  if (!tiers.has(MODEL_ROUTING_DEFAULT_TIER)) {
    return invalid(`model routing policy has no "default" tier`);
  }

  const categories = new Map<string, string>();

  for (const [category, tierName] of Object.entries(rawCategories)) {
    const tier = typeof tierName === 'string' ? tiers.get(tierName) : undefined;

    if (typeof tierName !== 'string' || tier === undefined) {
      return invalid(`category "${category}" maps to an unknown tier`);
    }

    if (tierName === MODEL_ROUTING_REVIEW_TIER || tier.neverAutoRouted) {
      return invalid(
        `category "${category}" maps to tier "${tierName}", which is never auto-routed`,
      );
    }

    categories.set(category.trim().toLowerCase(), tierName);
  }

  return {
    kind: 'ok',
    policy: { categories, defaultTier: MODEL_ROUTING_DEFAULT_TIER, tiers },
  };
};

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

export interface CreateModelRouterOptions {
  /** The driver's `discoverModels` listing; called once per router. */
  readonly discoverModels: DriverModelLister;
  readonly policy: ModelRoutingPolicy;
  /** The run's configured model; the honest fallback. */
  readonly runModel: string | undefined;
}

export interface ModelRouter {
  /** Plugs into `LoopDeps.modelFor`: the model passed to the driver and recorded on the session. */
  readonly modelFor: (task: LoopTask) => string | undefined;
  readonly route: (task: LoopTask) => RouteTaskModelResult;
}

/**
 * @description Discovers the driver's models once, then routes every task from that snapshot. A
 * failed discovery counts as "no models listed" and falls back to the run's model.
 * @public
 */
export const createModelRouter = async (
  options: CreateModelRouterOptions,
): Promise<ModelRouter> => {
  const { discoverModels, policy, runModel } = options;
  let driverModels: readonly string[];

  try {
    driverModels = await discoverModels();
  } catch {
    driverModels = [];
  }

  const route = (task: LoopTask): RouteTaskModelResult => {
    return routeTaskModel({
      category: task.category,
      driverModels,
      policy,
      runModel,
    });
  };

  return {
    modelFor: (task) => route(task).model,
    route,
  };
};

/**
 * @description Loads and schema-checks the routing policy by path. Pass the file path directly, or
 * use {@link readModelRoutingPolicyFromRoot}. Never throws: unreadable or malformed files come back
 * as `invalid`.
 * @public
 */
export const readModelRoutingPolicy = async (
  filePath: string,
): Promise<ModelRoutingPolicyResult> => {
  let text: string;

  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { kind: 'invalid', reason: `cannot read ${filePath}: ${message}` };
  }

  try {
    return parseModelRoutingPolicy(JSON.parse(text));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      kind: 'invalid',
      reason: `${filePath} is not valid JSON: ${message}`,
    };
  }
};

/**
 * @description Loads the policy from `skills/ot-loop/references/model-routing.json` under a
 * monorepo (or worktree) root.
 * @public
 */
export const readModelRoutingPolicyFromRoot = (
  root: string,
): Promise<ModelRoutingPolicyResult> => {
  return readModelRoutingPolicy(join(root, MODEL_ROUTING_POLICY_RELATIVE_PATH));
};
