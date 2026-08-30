/**
 * @description Server-only write side of the skill detail route: persists a
 * full-file SKILL.md edit for a discovered slug. The absolute target is derived
 * strictly from the discovered entry's `repoRelativePath` (never from client
 * input) and re-checked with the shared realpath allowlist; the new content's
 * frontmatter is re-validated before anything touches disk so a save can never
 * corrupt the file or break ingest. Provenance also gates the write: an entry is
 * writable when it is authored here (`source: 'openthrottle'`) or is the
 * author's own personal tier (`isPersonal`). A lockfile-installed external skill
 * stays read-only, because editing it in place forks it from the upstream source
 * the next ot-skill-sync would restore. A personal write goes THROUGH the
 * gitignored `.agents/skills/<slug>` symlink into the file under the personal
 * root — the symlink is never unlinked or replaced with a real file, which would
 * break ot-skill-sync and risk staging a personal skill. Local-checkout only — a
 * null monorepo root (deployed app) always refuses.
 *
 * Re-ingest is deliberately NOT triggered here: `projectSkills` refreshes on
 * the next `database:import` / agent-asset ingest run (documented in the
 * discovery design doc). The disk is the source of the entry list, so the UI
 * reflects a successful save immediately via loader revalidation.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { validateAgentAssetFrontmatter } from '@openthrottle/openthrottle-skills';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';
import { getMonorepoRoot } from '~/routing/agents/data/resolve-monorepo-root.server';
import { isAllowedSkillPath } from '~/routing/agents/data/skill-path-allowlist.server';
import { SKILL_WRITE_COPY } from '~/routing/skills/data/data.copy';

export type WriteSkillFileResult =
  { readonly error: string; readonly ok: false } | { readonly ok: true };

/**
 * @description Validates and writes the full SKILL.md for a discovered slug.
 * Refusals (no root, unknown slug, disallowed path, non-personal external
 * provenance, invalid frontmatter) return a structured error WITHOUT writing.
 */
export const writeSkillFileBySlug = (
  slug: string,
  content: string,
): WriteSkillFileResult => {
  const monorepoRoot = getMonorepoRoot();
  if (!monorepoRoot) {
    return { error: SKILL_WRITE_COPY.noRootError, ok: false };
  }

  const entries = discoverRepoSkills(monorepoRoot);
  const entry = entries.find((candidate) => candidate.slug === slug);
  if (!entry) {
    return { error: SKILL_WRITE_COPY.unknownSlugError, ok: false };
  }

  const absolutePath = join(monorepoRoot, entry.repoRelativePath);
  if (!isAllowedSkillPath(monorepoRoot, absolutePath)) {
    return { error: SKILL_WRITE_COPY.pathEscapeError, ok: false };
  }

  // Provenance comes from the freshly discovered entry (disk realpath), never
  // from client input — a lockfile-installed external skill never reaches
  // validation or disk. The personal tier is the author's own, so it is writable
  // even though it carries `source: 'external'`.
  if (entry.source !== 'openthrottle' && entry.isPersonal !== true) {
    return { error: SKILL_WRITE_COPY.externalSkillError, ok: false };
  }

  const { errors } = validateAgentAssetFrontmatter({
    content,
    expectedSlug: slug,
    kind: 'skill',
    path: entry.repoRelativePath,
  });

  if (errors.length > 0) {
    const detail = errors
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join('; ');
    return {
      error: `${SKILL_WRITE_COPY.invalidFrontmatterError} ${detail}`,
      ok: false,
    };
  }

  try {
    writeFileSync(absolutePath, content, 'utf8');
  } catch {
    return { error: SKILL_WRITE_COPY.writeFailedError, ok: false };
  }

  return { ok: true };
};
