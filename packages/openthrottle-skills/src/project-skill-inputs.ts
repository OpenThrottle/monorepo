import type { AgentAssetIngestRecord } from './map-agent-assets-for-ingest.ts';
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
   * Frontmatter provenance (`openthrottle` | `external`); omitted or
   * unrecognized frontmatter values normalize to `external`.
   */
  readonly source: SkillSource;
  /** Repo-relative SKILL.md path the skill was ingested from. */
  readonly sourcePath: string;
  /** Optional origin URL for external skills; `undefined` when omitted. */
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
 * @public
 */
export const toProjectSkillInputs = (
  records: readonly AgentAssetIngestRecord[],
  overlays?: SkillTagOverlayMap,
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

    inputs.push({
      disableModelInvocation: record.disableModelInvocation,
      slug,
      source: record.source ?? 'external',
      sourcePath: record.filePath,
      sourceUrl: record.sourceUrl,
      tags: mergeSkillTags(record.tags, overlays?.[slug]?.tags),
    });
  }

  return inputs;
};
