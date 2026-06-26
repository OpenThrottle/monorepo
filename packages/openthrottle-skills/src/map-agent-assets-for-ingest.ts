import { basename } from 'node:path';

import { parsePersonaFrontmatter } from './parse-persona-frontmatter.ts';
import { parseRuleFrontmatter } from './parse-rule-frontmatter.ts';
import { parseSkillFrontmatter } from './parse-skill-frontmatter.ts';
import type { AgentAssetFileEntry } from './walk-agent-assets-on-disk.ts';

export type AgentAssetPromptType = 'personas' | 'prompts' | 'rules' | 'skills';

export interface AgentAssetIngestRecord {
  readonly content: string;
  readonly description: string | null;
  readonly filePath: string;
  readonly labels: readonly string[];
  readonly promptType: AgentAssetPromptType;
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
 * @publicApi
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
      filePath: path,
      labels: slug ? [slug] : [],
      promptType: 'skills',
      title: frontmatter.name ?? slug ?? basename(path, '/SKILL.md'),
    };
  }

  if (kind === 'persona') {
    const frontmatter = parsePersonaFrontmatter(content);
    return {
      content,
      description: frontmatter.description ?? null,
      filePath: path,
      labels: ['persona', ...(slug ? [slug] : [])],
      promptType: 'personas',
      title: frontmatter.name ?? slug ?? basename(path, '.md'),
    };
  }

  if (kind === 'prompt') {
    const title = slug ?? basename(path, '.md');
    return {
      content,
      description: null,
      filePath: path,
      labels: slug ? [slug] : [],
      promptType: 'prompts',
      title,
    };
  }

  const frontmatter = parseRuleFrontmatter(content);
  const title = basename(path, '.mdc');

  return {
    content,
    description: frontmatter.description ?? null,
    filePath: path,
    labels: ruleLabelsFromPath(path),
    promptType: 'rules',
    title,
  };
};

/**
 * @description Maps walked agent asset files to ingest records.
 * @publicApi
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
