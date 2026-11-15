import type { ProductFeature, ProductPositioning } from '../types/product';

const ONE_LINER_MAX = 120;
const SHORT_MAX = 60;
const MEDIUM_MAX = 160;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @description The registry rules that need no network, as a list of
 * human-readable problems (empty when the registry is valid). The type system
 * already guarantees a `shipped` entry has a PR and a `planned` one a plan id;
 * this checks what types cannot: lengths, uniqueness and formats.
 * @public
 */
export const validateRegistry = (
  features: readonly ProductFeature[],
  positioning: ProductPositioning,
): string[] => {
  const problems: string[] = [];
  const pillarIds = new Set<string>(
    positioning.pillars.map((pillar) => {
      return pillar.id;
    }),
  );
  const seen = new Set<string>();
  const copies = [
    { copy: positioning.tagline, label: 'tagline' },
    { copy: positioning.lede, label: 'lede' },
    ...positioning.pillars.map((pillar) => {
      return { copy: pillar, label: `pillar ${pillar.id}` };
    }),
  ];

  for (const { copy, label } of copies) {
    if (copy.short.length > SHORT_MAX) {
      problems.push(
        `${label}: short form is ${copy.short.length} chars (max ${SHORT_MAX})`,
      );
    }

    if (copy.medium.length > MEDIUM_MAX) {
      problems.push(
        `${label}: medium form is ${copy.medium.length} chars (max ${MEDIUM_MAX})`,
      );
    }
  }

  for (const feature of features) {
    if (seen.has(feature.id)) {
      problems.push(`${feature.id}: duplicate id`);
    }

    seen.add(feature.id);

    if (feature.oneLiner.length > ONE_LINER_MAX) {
      problems.push(
        `${feature.id}: oneLiner is ${feature.oneLiner.length} chars (max ${ONE_LINER_MAX})`,
      );
    }

    if (!pillarIds.has(feature.pillar)) {
      problems.push(
        `${feature.id}: pillar "${feature.pillar}" is not in the canon`,
      );
    }

    if (!ISO_DATE.test(feature.since)) {
      problems.push(
        `${feature.id}: since "${feature.since}" is not YYYY-MM-DD`,
      );
    }

    for (const planId of feature.evidence.planIds) {
      if (!UUID.test(planId)) {
        problems.push(`${feature.id}: plan id "${planId}" is not a full UUID`);
      }
    }
  }

  return problems;
};
