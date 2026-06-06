import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import type { AgentAssetValidationIssue } from './schemas/agent-asset-frontmatter.schemas.js';
import {
  mergeValidationResults,
  validateAgentAssetFrontmatter,
} from './validate-agent-asset-frontmatter.js';
import type { ValidateAgentAssetsResult } from './validate-agent-asset-frontmatter.js';

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
): ReadonlyArray<{
  readonly content: string;
  readonly path: string;
  readonly slug: string;
}> => {
  const skillsRoot = join(monorepoRoot, '.agents/skills');
  if (!existsSync(skillsRoot)) {
    return [];
  }

  const results: Array<{ content: string; path: string; slug: string }> = [];

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
      path: toRepoRelativePath(monorepoRoot, skillPath),
      slug,
    });
  }

  return results;
};

const walkPersonaFiles = (
  monorepoRoot: string,
): ReadonlyArray<{
  readonly content: string;
  readonly path: string;
  readonly slug: string;
}> => {
  const personasRoot = join(monorepoRoot, '.agents/personas');
  if (!existsSync(personasRoot)) {
    return [];
  }

  const results: Array<{ content: string; path: string; slug: string }> = [];

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
      path: toRepoRelativePath(monorepoRoot, personaPath),
      slug,
    });
  }

  return results;
};

const walkRuleFiles = (
  monorepoRoot: string,
): ReadonlyArray<{ readonly content: string; readonly path: string }> => {
  const rulesRoot = join(monorepoRoot, '.agents/rules');
  if (!existsSync(rulesRoot)) {
    return [];
  }

  const results: Array<{ content: string; path: string }> = [];

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
        path: toRepoRelativePath(monorepoRoot, absolutePath),
      });
    }
  };

  walkDir(rulesRoot);
  return results;
};

/**
 * @description Walks `.agents/` SSOT trees and validates frontmatter per D5.
 * @publicApi
 */
export const validateAgentAssetsOnDisk = (
  options: WalkAgentAssetsOptions,
): ValidateAgentAssetsResult => {
  const { monorepoRoot } = options;
  const results = [];

  for (const skill of walkSkillFiles(monorepoRoot)) {
    results.push(
      validateAgentAssetFrontmatter({
        content: skill.content,
        expectedSlug: skill.slug,
        kind: 'skill',
        path: skill.path,
      }),
    );
  }

  for (const persona of walkPersonaFiles(monorepoRoot)) {
    results.push(
      validateAgentAssetFrontmatter({
        content: persona.content,
        expectedSlug: persona.slug,
        kind: 'persona',
        path: persona.path,
      }),
    );
  }

  for (const rule of walkRuleFiles(monorepoRoot)) {
    results.push(
      validateAgentAssetFrontmatter({
        content: rule.content,
        kind: 'rule',
        path: rule.path,
      }),
    );
  }

  return mergeValidationResults(results);
};

export type { AgentAssetValidationIssue };
