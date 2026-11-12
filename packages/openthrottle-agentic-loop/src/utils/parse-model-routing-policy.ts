import type {
  ModelRoutingPolicyResult,
  ModelRoutingTier,
} from '../contract/index.ts';
import {
  MODEL_ROUTING_DEFAULT_TIER,
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
