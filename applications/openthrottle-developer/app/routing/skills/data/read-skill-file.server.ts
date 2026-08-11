/**
 * @description Server-only read side of the skill detail route: resolves the
 * monorepo root, re-runs disk discovery, and reads the raw SKILL.md for a slug.
 * The target path is derived strictly from the discovered entry's
 * `repoRelativePath` (never from client input), and a realpath containment
 * check rejects anything that escapes the resolved monorepo root.
 */

import { readFileSync, realpathSync } from 'node:fs';
import { join, sep } from 'node:path';

import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { getMonorepoRoot } from '~/routing/agents/data/resolve-monorepo-root.server';

export interface ReadSkillFileResult {
  /** Raw SKILL.md content; empty string when unreadable (renders a notice). */
  readonly content: string;
  /** Whether the checkout supports write-back (a monorepo root resolved). */
  readonly editable: boolean;
  /** The discovered entry, or `undefined` when the slug is unknown. */
  readonly entry: RepoSkillEntry | undefined;
}

const isPathInsideRoot = (root: string, candidate: string): boolean => {
  try {
    const realRoot = realpathSync(root);
    const realCandidate = realpathSync(candidate);

    // realpath resolves the `.claude`/`.cursor` → `.agents` skill symlinks to
    // their in-repo targets, so containment under the real root is sufficient.
    return realCandidate.startsWith(`${realRoot}${sep}`);
  } catch {
    return false;
  }
};

/**
 * @description Reads a discovered skill's raw SKILL.md by slug. Unknown slug ⇒
 * `entry: undefined` (callers 404). Null monorepo root ⇒ not editable and no
 * entries (deployed app), matching the index route's empty-state behavior.
 */
export const readSkillFileBySlug = (slug: string): ReadSkillFileResult => {
  const monorepoRoot = getMonorepoRoot();
  if (!monorepoRoot) {
    return { content: '', editable: false, entry: undefined };
  }

  const entries = discoverRepoSkills(monorepoRoot);
  const entry = entries.find((candidate) => candidate.slug === slug);
  if (!entry) {
    return { content: '', editable: true, entry: undefined };
  }

  const absolutePath = join(monorepoRoot, entry.repoRelativePath);
  if (!isPathInsideRoot(monorepoRoot, absolutePath)) {
    return { content: '', editable: true, entry: undefined };
  }

  try {
    return {
      content: readFileSync(absolutePath, 'utf8'),
      editable: true,
      entry,
    };
  } catch {
    return { content: '', editable: true, entry };
  }
};
