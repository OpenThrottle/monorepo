/**
 * @description Maps a skill's three-way provenance to a display badge (color +
 * label + tooltip + optional origin href). DISPLAY ONLY — filtering lives in
 * `filter-skills-by-source`. Backend `SkillSource` is only
 * `external | openthrottle`; personal is a local `isPersonal` overlay.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import type { SkillSourceKind } from '~/routing/skills/utils/filter-skills-by-source';
import { getSkillSourceKind } from '~/routing/skills/utils/filter-skills-by-source';

export interface SkillSourceBadge {
  readonly color: 'accent' | 'green' | 'yellow';
  readonly href: string | undefined;
  readonly kind: SkillSourceKind;
  readonly label: string;
  readonly tooltip: string;
}

/**
 * @description Combined source-badge presentation. Personal never links out
 * (origin is a directory on this machine); OpenThrottle never links out
 * (authored here); External links when the lockfile supplied a `sourceUrl`.
 */
export const getSkillSourceBadge = (
  entry: Pick<RepoSkillEntry, 'isPersonal' | 'source' | 'sourceUrl'>,
): SkillSourceBadge => {
  const kind = getSkillSourceKind(entry);

  switch (kind) {
    case 'external':
      return {
        color: 'yellow',
        href: entry.sourceUrl,
        kind,
        label: SKILLS_SOURCE_COPY.externalLabel,
        tooltip: entry.sourceUrl
          ? `${SKILLS_SOURCE_COPY.externalUrlTooltipPrefix} ${entry.sourceUrl}`
          : SKILLS_SOURCE_COPY.externalTooltip,
      };
    case 'openthrottle':
      return {
        color: 'accent',
        href: undefined,
        kind,
        label: SKILLS_SOURCE_COPY.openthrottleLabel,
        tooltip: SKILLS_SOURCE_COPY.openthrottleTooltip,
      };

    case 'personal':
      return {
        color: 'green',
        href: undefined,
        kind,
        label: SKILLS_SOURCE_COPY.personalLabel,
        tooltip: SKILLS_SOURCE_COPY.personalTooltip,
      };

    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled skill source kind: ${String(exhaustive)}`);
    }
  }
};
