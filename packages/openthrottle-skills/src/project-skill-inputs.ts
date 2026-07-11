import type { AgentAssetIngestRecord } from './map-agent-assets-for-ingest.ts';

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
  /** Repo-relative SKILL.md path the skill was ingested from. */
  readonly sourcePath: string;
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
 * defaults absent `tags` to an empty list, and preserves the tri-state
 * `disableModelInvocation` flag. Non-skill records are dropped.
 * @public
 */
export const toProjectSkillInputs = (
  records: readonly AgentAssetIngestRecord[],
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
      sourcePath: record.filePath,
      tags: record.tags ?? [],
    });
  }

  return inputs;
};
