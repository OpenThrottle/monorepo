/**
 * @description Maps a skill's tri-state static `disable-model-invocation` flag to
 * a display badge (color + label + tooltip). DISPLAY ONLY — no filtering or
 * gating. See docs/monorepo/skill-availability-design.md ("Surfacing").
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export interface ModelInvocationBadge {
  readonly color: 'amber' | 'green' | 'slate';
  readonly label: string;
  readonly tooltip: string;
}

/**
 * @description Tri-state badge for `disable-model-invocation`:
 * `true` → "Manual only" (auto invocation suppressed), `false` → "Auto enabled"
 * (explicitly invocable), `undefined` → "Default (auto)" (frontmatter unset).
 */
export const getModelInvocationBadge = (
  disableModelInvocation: RepoSkillEntry['disableModelInvocation'],
): ModelInvocationBadge => {
  if (disableModelInvocation === true) {
    return {
      color: 'amber',
      label: 'Manual only',
      tooltip:
        'disable-model-invocation: true — automatic (model-initiated) invocation is suppressed. A human can still run /<skill> explicitly.',
    };
  }

  if (disableModelInvocation === false) {
    return {
      color: 'green',
      label: 'Auto enabled',
      tooltip:
        'disable-model-invocation: false — automatic (model-initiated) invocation is explicitly enabled.',
    };
  }

  return {
    color: 'slate',
    label: 'Default (auto)',
    tooltip:
      'disable-model-invocation is unset — defaults to model-invocable (automatic invocation allowed).',
  };
};
