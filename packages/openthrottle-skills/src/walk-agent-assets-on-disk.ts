import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import type { AgentAssetKind } from './schemas/agent-asset-frontmatter.schemas.ts';

export interface AgentAssetFileEntry {
  readonly content: string;
  readonly kind: AgentAssetKind;
  readonly path: string;
  readonly slug: string | undefined;
}

export interface WalkAgentAssetsOptions {
  readonly monorepoRoot: string;
}

const SKIP_BASENAMES = new Set(['README.md', '_template.md']);
const SKIP_RULE_BASENAMES = new Set(['nx-rules.mdc']);

const toRepoRelativePath = (
  monorepoRoot: string,
  absolutePath: string,
): string => relative(monorepoRoot, absolutePath).split('\\').join('/');

const walkSkillFiles = (
  monorepoRoot: string,
): ReadonlyArray<AgentAssetFileEntry> => {
  const skillsRoot = join(monorepoRoot, '.agents/skills');
  if (!existsSync(skillsRoot)) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  for (const dirent of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory()) {
      continue;
    }

    const slug = dirent.name;
    const skillPath = join(skillsRoot, slug, 'SKILL.md');
    if (!existsSync(skillPath)) {
      continue;
    }

    results.push({
      content: readFileSync(skillPath, 'utf8'),
      kind: 'skill',
      path: toRepoRelativePath(monorepoRoot, skillPath),
      slug,
    });
  }

  return results;
};

const walkPersonaFiles = (
  monorepoRoot: string,
): ReadonlyArray<AgentAssetFileEntry> => {
  const personasRoot = join(monorepoRoot, '.agents/personas');
  if (!existsSync(personasRoot)) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  for (const dirent of readdirSync(personasRoot, { withFileTypes: true })) {
    if (!dirent.isFile() || !dirent.name.endsWith('.md')) {
      continue;
    }
    if (SKIP_BASENAMES.has(dirent.name)) {
      continue;
    }

    const slug = basename(dirent.name, '.md');
    const personaPath = join(personasRoot, dirent.name);
    results.push({
      content: readFileSync(personaPath, 'utf8'),
      kind: 'persona',
      path: toRepoRelativePath(monorepoRoot, personaPath),
      slug,
    });
  }

  return results;
};

const walkPromptFiles = (
  monorepoRoot: string,
): ReadonlyArray<AgentAssetFileEntry> => {
  const promptsRoot = join(monorepoRoot, '.agents/prompts');
  if (!existsSync(promptsRoot)) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  for (const dirent of readdirSync(promptsRoot, { withFileTypes: true })) {
    if (!dirent.isFile() || !dirent.name.endsWith('.md')) {
      continue;
    }
    if (SKIP_BASENAMES.has(dirent.name)) {
      continue;
    }

    const slug = basename(dirent.name, '.md');
    const promptPath = join(promptsRoot, dirent.name);
    results.push({
      content: readFileSync(promptPath, 'utf8'),
      kind: 'prompt',
      path: toRepoRelativePath(monorepoRoot, promptPath),
      slug,
    });
  }

  return results;
};

const walkRuleFiles = (
  monorepoRoot: string,
): ReadonlyArray<AgentAssetFileEntry> => {
  const rulesRoot = join(monorepoRoot, '.agents/rules');
  if (!existsSync(rulesRoot)) {
    return [];
  }

  const results: AgentAssetFileEntry[] = [];

  const walkDir = (dir: string): void => {
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        walkDir(absolutePath);
        continue;
      }

      if (!dirent.isFile() || !dirent.name.endsWith('.mdc')) {
        continue;
      }
      if (SKIP_RULE_BASENAMES.has(dirent.name)) {
        continue;
      }

      results.push({
        content: readFileSync(absolutePath, 'utf8'),
        kind: 'rule',
        path: toRepoRelativePath(monorepoRoot, absolutePath),
        slug: undefined,
      });
    }
  };

  walkDir(rulesRoot);
  return results;
};

/**
 * @description Walks `.agents/` SSOT trees for skills, personas, rules, and prompts.
 * @publicApi
 */
export const walkAgentAssetFiles = (
  options: WalkAgentAssetsOptions,
): ReadonlyArray<AgentAssetFileEntry> => {
  const { monorepoRoot } = options;

  return [
    ...walkSkillFiles(monorepoRoot),
    ...walkPersonaFiles(monorepoRoot),
    ...walkRuleFiles(monorepoRoot),
    ...walkPromptFiles(monorepoRoot),
  ];
};
