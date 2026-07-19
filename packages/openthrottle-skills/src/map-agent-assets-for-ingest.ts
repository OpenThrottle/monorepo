import { basename } from 'node:path';

import { parsePersonaFrontmatter } from './parse-persona-frontmatter.ts';
import { parseRuleFrontmatter } from './parse-rule-frontmatter.ts';
import { parseSkillFrontmatter } from './parse-skill-frontmatter.ts';
import type { SkillSource } from './schemas/agent-asset-frontmatter.schemas.ts';
import type { AgentAssetFileEntry } from './walk-agent-assets-on-disk.ts';

export type AgentAssetPromptType = 'personas' | 'prompts' | 'rules' | 'skills';

export interface AgentAssetIngestRecord {
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
   * Skill-only: frontmatter provenance (`openthrottle` | `external`; omitted or
   * unrecognized values normalize to `external`). `undefined` for non-skill assets.
   */
  readonly source: SkillSource | undefined;
  /**
   * Skill-only: optional origin URL for external skills. `undefined` for
   * non-skill assets and for skills that omit the key.
   */
  readonly sourceUrl: string | undefined;
  /**
   * Skill-only: the static `tags` frontmatter list. `undefined` for non-skill
   * assets and for skills that omit the key (distinct from an explicit empty list).
   */
  readonly tags: readonly string[] | undefined;
  readonly title: string;
}

const ruleLabelsFromPath = (filePath: string): readonly string[] => {
  const labels: string[] = [];

  if (filePath.includes('/coding/')) {
    labels.push('coding');
  }
  if (filePath.includes('/commands/')) {
    labels.push('commands');
  }

  return labels;
};

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
      content,
      description: frontmatter.description ?? null,
      disableModelInvocation: frontmatter.disableModelInvocation,
      filePath: path,
      labels: slug ? [slug] : [],
      promptType: 'skills',
      source: frontmatter.source,
      sourceUrl: frontmatter.sourceUrl,
      tags: frontmatter.tags,
      title: frontmatter.name ?? slug ?? basename(path, '/SKILL.md'),
    };
  }

  if (kind === 'persona') {
    const frontmatter = parsePersonaFrontmatter(content);
    return {
      content,
      description: frontmatter.description ?? null,
      disableModelInvocation: undefined,
      filePath: path,
      labels: ['persona', ...(slug ? [slug] : [])],
      promptType: 'personas',
      source: undefined,
      sourceUrl: undefined,
      tags: undefined,
      title: frontmatter.name ?? slug ?? basename(path, '.md'),
    };
  }

  if (kind === 'prompt') {
    const title = slug ?? basename(path, '.md');
    return {
      content,
      description: null,
      disableModelInvocation: undefined,
      filePath: path,
      labels: slug ? [slug] : [],
      promptType: 'prompts',
      source: undefined,
      sourceUrl: undefined,
      tags: undefined,
      title,
    };
  }

  const frontmatter = parseRuleFrontmatter(content);
  const title = basename(path, '.mdc');

  return {
    content,
    description: frontmatter.description ?? null,
    disableModelInvocation: undefined,
    filePath: path,
    labels: ruleLabelsFromPath(path),
    promptType: 'rules',
    source: undefined,
    sourceUrl: undefined,
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

/** @description Repo-relative path prefixes ingested into `custom_prompts`. */
export const AGENT_ASSET_INGEST_PATH_PREFIXES = [
  '.agents/personas/',
  '.agents/prompts/',
  '.agents/rules/',
  '.agents/skills/',
] as const;
