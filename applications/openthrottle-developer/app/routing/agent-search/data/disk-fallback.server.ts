/**
 * @description Live disk-scan fallback for agent-assets search, used when the semantic index
 * (custom_prompt_embeddings) is empty or unavailable. Discovers on-disk skills, rules, and
 * personas and keyword-ranks them against the query. Server-only (uses node:fs).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseSkillFrontmatter } from '@openthrottle/openthrottle-skills';
import { discoverRepoPersonas } from '~/routing/agents/data/discover-repo-personas.server';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import type {
  AgentAssetPromptType,
  AgentAssetResult,
} from '~/routing/agent-search/types';

const RULES_DIR = '.agents/rules';

const SNIPPET_LENGTH = 240;

/** A candidate asset gathered from disk before ranking. */
interface DiskCandidate {
  readonly filePath: string;
  readonly promptType: AgentAssetPromptType;
  readonly summary: string;
  readonly title: string;
}

const readFileSafe = (
  monorepoRoot: string,
  repoRelativePath: string,
): string => {
  try {
    return readFileSync(join(monorepoRoot, repoRelativePath), 'utf8');
  } catch {
    return '';
  }
};

const collectSkillCandidates = (monorepoRoot: string): DiskCandidate[] =>
  discoverRepoSkills(monorepoRoot).map((entry) => ({
    filePath: entry.repoRelativePath,
    promptType: 'skills',
    summary: entry.summary,
    title: entry.slug,
  }));

const collectPersonaCandidates = (monorepoRoot: string): DiskCandidate[] =>
  discoverRepoPersonas(monorepoRoot).map((entry) => ({
    filePath: entry.repoRelativePath,
    promptType: 'personas',
    summary: entry.summary,
    title: entry.slug,
  }));

const collectRuleCandidates = (monorepoRoot: string): DiskCandidate[] => {
  const absoluteRulesDir = join(monorepoRoot, RULES_DIR);
  if (!existsSync(absoluteRulesDir)) {
    return [];
  }

  let fileNames: string[];
  try {
    fileNames = readdirSync(absoluteRulesDir).filter((name) =>
      name.endsWith('.mdc'),
    );
  } catch {
    return [];
  }

  return fileNames.map((fileName) => {
    const repoRelativePath = `${RULES_DIR}/${fileName}`;
    const content = readFileSafe(monorepoRoot, repoRelativePath);
    const { description, name } = parseSkillFrontmatter(content);
    const title =
      name && name.trim().length > 0 ? name.trim() : basename(fileName, '.mdc');
    const summary =
      description && description.trim().length > 0 ? description.trim() : '';

    return { filePath: repoRelativePath, promptType: 'rules', summary, title };
  });
};

const COLLECTORS: Readonly<
  Record<AgentAssetPromptType, (monorepoRoot: string) => DiskCandidate[]>
> = {
  personas: collectPersonaCandidates,
  rules: collectRuleCandidates,
  skills: collectSkillCandidates,
};

/** Counts how many query terms appear in the haystack (case-insensitive). */
const scoreCandidate = (terms: readonly string[], haystack: string): number => {
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower.includes(term)) {
      score += 1;
    }
  }
  return score;
};

const toSnippet = (summary: string, content: string): string => {
  const base = summary.length > 0 ? summary : content.trim();
  return base.length > SNIPPET_LENGTH
    ? `${base.slice(0, SNIPPET_LENGTH)}…`
    : base;
};

/**
 * @description Discovers on-disk agent assets for the given prompt types and keyword-ranks them
 * against the query. Returns up to `limit` results tagged `source: 'disk'` (similarity null).
 * Returns an empty list when no monorepo root is resolvable or nothing matches.
 */
export const diskFallbackSearch = (
  query: string,
  promptTypes: readonly AgentAssetPromptType[],
  limit: number,
  monorepoRoot: string | null,
): AgentAssetResult[] => {
  const trimmed = query.trim();
  if (!monorepoRoot || trimmed.length === 0) {
    return [];
  }

  const terms = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) {
    return [];
  }

  const ranked: {
    readonly result: AgentAssetResult;
    readonly score: number;
  }[] = [];

  for (const promptType of promptTypes) {
    const candidates = COLLECTORS[promptType](monorepoRoot);
    for (const candidate of candidates) {
      const content = readFileSafe(monorepoRoot, candidate.filePath);
      const haystack = `${candidate.title} ${candidate.summary} ${content}`;
      const score = scoreCandidate(terms, haystack);
      if (score === 0) {
        continue;
      }

      ranked.push({
        result: {
          content: toSnippet(candidate.summary, content),
          customPromptId: null,
          description: candidate.summary.length > 0 ? candidate.summary : null,
          filePath: candidate.filePath,
          id: `disk:${candidate.promptType}:${candidate.filePath}`,
          labels: [],
          promptType: candidate.promptType,
          similarity: null,
          source: 'disk',
          title: candidate.title,
        },
        score,
      });
    }
  }

  return ranked
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.result);
};
