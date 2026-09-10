import { basename } from 'node:path';

import { parsePersonaFrontmatter } from './parse-persona-frontmatter.ts';
import { parseSkillFrontmatter } from './parse-skill-frontmatter.ts';
import type { AgentAssetFileEntry } from './walk-agent-assets-on-disk.ts';

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
): readonly AgentAssetIngestRecord[] =>
  entries.map((entry) => mapAgentAssetFileToIngestRecord(entry));

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
