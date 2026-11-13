import { basename } from 'node:path';

import {
  parsePersonaFrontmatter,
  parseSkillFrontmatter,
  type ValidateAgentAssetsResult,
} from './agent-asset-frontmatter.ts';
import {
  type AgentAssetFileEntry,
  validateAgentAssetsOnDisk,
  walkAgentAssetFiles,
  type WalkAgentAssetsOptions,
} from './agent-assets-disk.ts';
import {
  deriveSkillSourceUrl,
  type SkillsLockMap,
} from './parse-skills-lock.ts';
import type { SkillSource } from './schemas/agent-asset-frontmatter.schemas.ts';

export type AgentAssetPromptType = 'personas' | 'prompts' | 'skills';

export interface AgentAssetIngestRecord {
  /**
   * Skill-only: whether the skill folder resolves under the repo's authored
   * `skills/` tree (see {@link AgentAssetFileEntry.authored}). Provenance is
   * derived from this virtually — never from frontmatter. `undefined` for
   * non-skill assets.
   */
  readonly authored: boolean | undefined;
  readonly content: string;
  readonly description: string | null;
  /**
   * Skill-only: the static `disable-model-invocation` frontmatter flag, tri-state
   * (`true` | `false` | `undefined`). `undefined` for non-skill assets and for
   * skills that omit the key.
   */
  readonly disableModelInvocation: boolean | undefined;
  readonly filePath: string;
  readonly labels: readonly string[];
  readonly promptType: AgentAssetPromptType;
  /**
   * Skill-only: the static `tags` frontmatter list. `undefined` for non-skill
   * assets and for skills that omit the key (distinct from an explicit empty list).
   */
  readonly tags: readonly string[] | undefined;
  readonly title: string;
}

/**
 * @description Maps a walked agent asset file to a `custom_prompts` ingest row (D2 natural key: file_path + prompt_type).
 * @public
 */
export const mapAgentAssetFileToIngestRecord = (
  entry: AgentAssetFileEntry,
): AgentAssetIngestRecord => {
  const { content, kind, path, slug } = entry;

  if (kind === 'skill') {
    const frontmatter = parseSkillFrontmatter(content);
    return {
      authored: entry.authored ?? false,
      content,
      description: frontmatter.description ?? null,
      disableModelInvocation: frontmatter.disableModelInvocation,
      filePath: path,
      labels: slug ? [slug] : [],
      promptType: 'skills',
      tags: frontmatter.tags,
      title: frontmatter.name ?? slug ?? basename(path, '/SKILL.md'),
    };
  }

  if (kind === 'persona') {
    const frontmatter = parsePersonaFrontmatter(content);
    return {
      authored: undefined,
      content,
      description: frontmatter.description ?? null,
      disableModelInvocation: undefined,
      filePath: path,
      labels: ['persona', ...(slug ? [slug] : [])],
      promptType: 'personas',
      tags: undefined,
      title: frontmatter.name ?? slug ?? basename(path, '.md'),
    };
  }

  // Prompts are the remaining kind, so this is the fall-through rather than a
  // fourth branch — `AgentAssetKind` has exactly three members.
  const title = slug ?? basename(path, '.md');

  return {
    authored: undefined,
    content,
    description: null,
    disableModelInvocation: undefined,
    filePath: path,
    labels: slug ? [slug] : [],
    promptType: 'prompts',
    tags: undefined,
    title,
  };
};

/**
 * @description Maps walked agent asset files to ingest records.
 * @public
 */
export const mapAgentAssetFilesToIngestRecords = (
  entries: readonly AgentAssetFileEntry[],
): readonly AgentAssetIngestRecord[] => {
  return entries.map((entry) => mapAgentAssetFileToIngestRecord(entry));
};

/**
 * @description Repo-relative path prefixes ingested into `custom_prompts`.
 *
 * This array also drives the ingest's **stale sweep**: a row is soft-deleted
 * only when its `file_path` matches one of these prefixes *and* is absent from
 * the current walk. Dropping a prefix therefore strands every row beneath it —
 * `deleted_at` stays null forever, with live embeddings, surfacing in
 * `semantic_search` as a ghost asset. The retired `rule` kind's prefix was
 * removed here, and its orphaned rows are reaped by an explicit migration
 * rather than by the sweep. Do the same for any future removal.
 */
export const AGENT_ASSET_INGEST_PATH_PREFIXES = [
  '.agents/personas/',
  '.agents/prompts/',
  '.agents/skills/',
] as const;

/**
 * A single skill's server-queryable projection, derived from an ingest record.
 * The unit a per-project skill row is reconciled from: the slug plus its static
 * frontmatter `tags` and `disable-model-invocation` flag, and the SSOT path the
 * skill was ingested from.
 */
export interface ProjectSkillInput {
  /**
   * Frontmatter `description`; `null` when the skill omits it. Ingested so the
   * developer app's `/skills` menu can show descriptions in deployed
   * environments with no local checkout.
   */
  readonly description: string | null;
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
  /**
   * Frontmatter `tags` only (empty when omitted). Ingest does not merge overlay
   * files; record-owned tags are written after ingest and preserved on upsert.
   */
  readonly tags: readonly string[];
}

const slugFromLabels = (record: AgentAssetIngestRecord): string | undefined => {
  const [slug] = record.labels;
  return typeof slug === 'string' && slug.length > 0 ? slug : undefined;
};

/**
 * @description Projects skill ingest records to the per-project skill rows the
 * availability surface queries. Filters to `skills` records that carry a slug,
 * copies frontmatter `tags` as-is (empty when omitted — no overlay merge), and
 * preserves the tri-state `disableModelInvocation` flag. Non-skill records are
 * dropped.
 *
 * `lock` is the parsed repo-root skills-lock.json map; it supplies the origin
 * URL for lockfile-installed (non-authored) skills. Omit it when the repo has
 * no lockfile — external skills then carry no `sourceUrl`.
 * @public
 */
export const toProjectSkillInputs = (
  records: readonly AgentAssetIngestRecord[],
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
      description: record.description,
      disableModelInvocation: record.disableModelInvocation,
      slug,
      source: authored ? 'openthrottle' : 'external',
      sourcePath: record.filePath,
      sourceUrl: authored ? undefined : deriveSkillSourceUrl(lock?.[slug]),
      tags: record.tags ?? [],
    });
  }

  return inputs;
};

export interface CollectAgentAssetsForIngestResult {
  readonly records: readonly AgentAssetIngestRecord[];
  readonly validation: ValidateAgentAssetsResult;
}

/**
 * @description Validates `.agents/` frontmatter (D5) and maps files to `custom_prompts` ingest rows.
 * @public
 */
export const collectAgentAssetsForIngest = (
  options: WalkAgentAssetsOptions,
): CollectAgentAssetsForIngestResult => {
  const validation = validateAgentAssetsOnDisk(options);
  const { files } = walkAgentAssetFiles(options);
  const records = mapAgentAssetFilesToIngestRecords(files);

  return { records, validation };
};
