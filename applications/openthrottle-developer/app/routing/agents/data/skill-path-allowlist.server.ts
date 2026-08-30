/**
 * @description The single realpath allowlist for skill files on disk, shared by
 * discovery and by the detail route's read/write helpers.
 *
 * A skill folder can legitimately live in one of two places: inside the monorepo
 * checkout (authored under `skills/`, or lockfile-installed under a scanned
 * layout dir), or under the per-user personal skills root, linked into the repo
 * as a gitignored symlink by ot-skill-sync. Everything else — a rogue link into
 * some other directory, a dangling link, an unresolvable path — is out.
 *
 * Membership in the CURRENTLY RESOLVED personal root is the test, not "anything
 * outside the repo": the personal tier is presence-opt-in and honours
 * `OPENTHROTTLE_PERSONAL_SKILLS_DIR`. A root that does not exist simply makes
 * that arm false, leaving authored/external behaviour byte-identical.
 *
 * @see docs/monorepo/foreign-workspace-skill-injection.md §7.3
 */

import { realpathSync } from 'node:fs';
import { sep } from 'node:path';

import { resolvePersonalSkillsRoot } from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description True when `candidate` resolves (after realpath) strictly inside
 * `root`. Both sides are realpath'd so the `.claude`/`.cursor` → `.agents`
 * symlink fan-out resolves to its in-repo target. Unresolvable ⇒ false.
 */
export const isPathInsideRoot = (root: string, candidate: string): boolean => {
  try {
    const realRoot = realpathSync(root);
    return realpathSync(candidate).startsWith(`${realRoot}${sep}`);
  } catch {
    return false;
  }
};

/**
 * @description True when `candidate` resolves under the personal skills root
 * resolved from the current environment. Never uses `resolvePersonalSkillsDir`:
 * that wrapper is the foreign-injection gate (`OPENTHROTTLE_PERSONAL_SKILLS_ENABLED`,
 * default off), which has nothing to do with the in-repo tier.
 */
export const isPathInsidePersonalSkillsRoot = (candidate: string): boolean =>
  isPathInsideRoot(resolvePersonalSkillsRoot(), candidate);

/**
 * @description The allowlist a skill path must satisfy before it is read from or
 * written to: inside the monorepo root, or inside the personal skills root.
 */
export const isAllowedSkillPath = (
  monorepoRoot: string,
  candidate: string,
): boolean =>
  isPathInsideRoot(monorepoRoot, candidate) ||
  isPathInsidePersonalSkillsRoot(candidate);
