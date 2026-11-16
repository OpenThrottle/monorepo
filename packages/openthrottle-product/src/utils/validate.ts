import type {
  ProductFeature,
  ProductPositioning,
  ProductProject,
} from '../types/product';

const ONE_LINER_MAX = 120;
const PROJECT_SUMMARY_MAX = 100;
const SHORT_MAX = 60;
const MEDIUM_MAX = 160;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GRAPHEMES = new Intl.Segmenter('en', { granularity: 'grapheme' });

const countGraphemes = (text: string): number => {
  return [...GRAPHEMES.segment(text)].length;
};

/**
 * @description The registry rules that need no network, as a list of
 * human-readable problems (empty when the registry is valid). The type system
 * already guarantees a `shipped` entry has a PR and a `planned` one a plan id;
 * this checks what types cannot: lengths, uniqueness, formats and that
 * each `emoji` is exactly one grapheme.
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

  const checkEmoji = (label: string, emoji: string): void => {
    const graphemes = countGraphemes(emoji);

    if (graphemes === 0) {
      problems.push(`${label}: emoji is empty`);
    } else if (graphemes > 1) {
      problems.push(
        `${label}: emoji "${emoji}" is ${graphemes} graphemes (max 1)`,
      );
    }
  };

  for (const pillar of positioning.pillars) {
    checkEmoji(`pillar ${pillar.id}`, pillar.emoji);
  }

  for (const feature of features) {
    if (seen.has(feature.id)) {
      problems.push(`${feature.id}: duplicate id`);
    }

    seen.add(feature.id);

    checkEmoji(feature.id, feature.emoji);

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

/**
 * @description Static rules for the org profile's project list: unique names,
 * summaries within length, and no pipe characters that would break the
 * Markdown table. Whether each `path` exists is checked by `check-surfaces`.
 * @public
 */
export const validateProjects = (
  projects: readonly ProductProject[],
): string[] => {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const project of projects) {
    if (seen.has(project.name)) {
      problems.push(`project ${project.name}: duplicate name`);
    }

    seen.add(project.name);

    if (project.summary.length > PROJECT_SUMMARY_MAX) {
      problems.push(
        `project ${project.name}: summary is ${project.summary.length} chars (max ${PROJECT_SUMMARY_MAX})`,
      );
    }

    if (project.summary.includes('|')) {
      problems.push(`project ${project.name}: summary contains "|"`);
    }
  }

  return problems;
};
