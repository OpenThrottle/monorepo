import type { AgentAssetIngestRecord } from './map-agent-assets-for-ingest.ts';
import {
  deriveSkillSourceUrl,
  type SkillsLockMap,
} from './parse-skills-lock.ts';
import type { SkillSource } from './schemas/agent-asset-frontmatter.schemas.ts';
import {
  mergeSkillTags,
  type SkillTagOverlayMap,
} from './skill-tag-overlays.ts';

/**
 * A single skill's server-queryable projection, derived from an ingest record.
 * The unit a per-project skill row is reconciled from: the slug plus its static
 * frontmatter `tags` and `disable-model-invocation` flag, and the SSOT path the
 * skill was ingested from.
 */
export interface ProjectSkillInput {
  /**
   * Static `disable-model-invocation`, tri-state (`true` | `false` |
   * `undefined`); `undefined` when the skill omits the key.
   */
  readonly disableModelInvocation: boolean | undefined;
  /** Kebab-case skill slug (the `.agents/skills/<slug>` directory name). */
  readonly slug: string;
  /**
   * Derived provenance: `openthrottle` when the skill folder resolves under
   * the repo's authored `skills/` tree, `external` otherwise (lockfile
   * install). Never read from frontmatter.
   */
  readonly source: SkillSource;
  /** Repo-relative SKILL.md path the skill was ingested from. */
  readonly sourcePath: string;
  /**
   * Origin URL for external skills, derived from the skills-lock.json entry;
   * `undefined` for authored skills or when the lockfile has no usable source.
   */
  readonly sourceUrl: string | undefined;
  /** Static `tags`; an empty list when the skill declares none. */
  readonly tags: readonly string[];
}

const slugFromLabels = (record: AgentAssetIngestRecord): string | undefined => {
  const [slug] = record.labels;
  return typeof slug === 'string' && slug.length > 0 ? slug : undefined;
};

/**
 * @description Projects skill ingest records to the per-project skill rows the
 * availability surface queries. Filters to `skills` records that carry a slug,
 * merges each skill's frontmatter `tags` with its overlay `tags` (order-preserving
 * union), and preserves the tri-state `disableModelInvocation` flag. Non-skill
 * records are dropped.
 *
 * `overlays` is the monorepo-local per-slug attachment map (from the repo-root
 * skill-tag overlay file). Omit it for external workspace repos, whose tags come
 * from frontmatter alone — behaviour then reduces to the prior frontmatter-only
 * projection.
 *
 * `lock` is the parsed repo-root skills-lock.json map; it supplies the origin
 * URL for lockfile-installed (non-authored) skills. Omit it when the repo has
 * no lockfile — external skills then carry no `sourceUrl`.
 * @public
 */
export const toProjectSkillInputs = (
  records: readonly AgentAssetIngestRecord[],
  overlays?: SkillTagOverlayMap,
  lock?: SkillsLockMap,
): readonly ProjectSkillInput[] => {
  const inputs: ProjectSkillInput[] = [];

  for (const record of records) {
    if (record.promptType !== 'skills') {
      continue;
    }

    const slug = slugFromLabels(record);
    if (slug === undefined) {
      continue;
    }

    const authored = record.authored === true;
    inputs.push({
      disableModelInvocation: record.disableModelInvocation,
      slug,
      source: authored ? 'openthrottle' : 'external',
      sourcePath: record.filePath,
      sourceUrl: authored ? undefined : deriveSkillSourceUrl(lock?.[slug]),
      tags: mergeSkillTags(record.tags, overlays?.[slug]?.tags),
    });
  }

  return inputs;
};
