/**
 * @description Maps a skill's four-way provenance to a display badge (color +
 * label + tooltip + optional origin href). DISPLAY ONLY — filtering lives in
 * `filter-skills-by-source`. Backend `SkillSource` is only
 * `external | openthrottle`; personal and custom are local `isPersonal` /
 * `isCustom` overlays.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import type { SkillSourceKind } from '~/routing/skills/utils/filter-skills-by-source';
import { getSkillSourceKind } from '~/routing/skills/utils/filter-skills-by-source';

export interface SkillSourceBadge {
  readonly color: 'accent' | 'green' | 'violet' | 'yellow';
  readonly href: string | undefined;
  readonly kind: SkillSourceKind;
  readonly label: string;
  readonly tooltip: string;
}

/**
 * @description Combined source-badge presentation. Personal never links out
 * (origin is a directory on this machine); Custom never links out (authored in
 * this repository, so there is no origin to link); OpenThrottle never links
 * out (authored here); External links when the lockfile supplied a `sourceUrl`.
 */
export const getSkillSourceBadge = (
  entry: Pick<
    RepoSkillEntry,
    'isCustom' | 'isPersonal' | 'source' | 'sourceUrl'
  >,
): SkillSourceBadge => {
  const kind = getSkillSourceKind(entry);

  switch (kind) {
    case 'custom':
      return {
        color: 'violet',
        href: undefined,
        kind,
        label: SKILLS_SOURCE_COPY.customLabel,
        tooltip: SKILLS_SOURCE_COPY.customTooltip,
      };

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
