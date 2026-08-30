/**
 * @description Server-only read side of the skill detail route: resolves the
 * monorepo root, re-runs disk discovery, and reads the raw SKILL.md for a slug.
 * The target path is derived strictly from the discovered entry's
 * `repoRelativePath` (never from client input), and the shared realpath
 * allowlist rejects anything resolving outside the monorepo root or the
 * personal skills root.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { splitFrontmatter } from '@openthrottle/openthrottle-skills';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { getMonorepoRoot } from '~/routing/agents/data/resolve-monorepo-root.server';
import { isAllowedSkillPath } from '~/routing/agents/data/skill-path-allowlist.server';

export interface ReadSkillFileResult {
  /** SKILL.md body with the YAML frontmatter stripped; empty when unreadable. */
  readonly content: string;
  /** Whether the checkout supports write-back (a monorepo root resolved). */
  readonly editable: boolean;
  /** The discovered entry, or `undefined` when the slug is unknown. */
  readonly entry: RepoSkillEntry | undefined;
  /** Parsed frontmatter fields; `{}` when there is none or the file is unreadable. */
  readonly metadata: Record<string, unknown>;
  /**
   * The untouched SKILL.md (frontmatter included); `''` when unreadable. The
   * editor round-trips this so a save preserves the frontmatter that `content`
   * strips for rendering.
   */
  readonly rawContent: string;
}

/**
 * @description Reads a discovered skill's raw SKILL.md by slug. A personal-tier
 * skill reads exactly like an authored one: the in-repo symlink is followed to
 * the file under the personal root, so no second lookup by slug is needed.
 * Unknown slug ⇒ `entry: undefined` (callers 404). Null monorepo root ⇒ not
 * editable and no entries (deployed app), matching the index route's
 * empty-state behavior.
 */
export const readSkillFileBySlug = (slug: string): ReadSkillFileResult => {
  const monorepoRoot = getMonorepoRoot();
  if (!monorepoRoot) {
    return {
      content: '',
      editable: false,
      entry: undefined,
      metadata: {},
      rawContent: '',
    };
  }

  const entries = discoverRepoSkills(monorepoRoot);
  const entry = entries.find((candidate) => candidate.slug === slug);
  if (!entry) {
    return {
      content: '',
      editable: true,
      entry: undefined,
      metadata: {},
      rawContent: '',
    };
  }

  const absolutePath = join(monorepoRoot, entry.repoRelativePath);
  if (!isAllowedSkillPath(monorepoRoot, absolutePath)) {
    return {
      content: '',
      editable: true,
      entry: undefined,
      metadata: {},
      rawContent: '',
    };
  }

  try {
    const { content, metadata, rawSkill } = splitFrontmatter(
      readFileSync(absolutePath, 'utf8'),
    );
    return { content, editable: true, entry, metadata, rawContent: rawSkill };
  } catch {
    return { content: '', editable: true, entry, metadata: {}, rawContent: '' };
  }
};
