/**
 * @description Finds the ot-worktree action script (`create.sh`, `destroy.sh`, `heal.sh`) to exec
 * against a checkout, so the server never shells out to `pnpm run worktree:*` — package scripts that
 * exist only in the OpenThrottle monorepo's own `package.json`.
 *
 * Ladder, first readable file wins:
 *   1. `<checkout>/skills/ot-worktree/scripts/` — the OpenThrottle monorepo's SSOT.
 *   2. `<checkout>/.agents/skills/ot-worktree/scripts/` — the overlay OT materializes into foreign repos.
 *   3. `<checkout>/.claude/skills/ot-worktree/scripts/` — the same overlay's Claude fan-out.
 *   4. `<OT root>/skills/ot-worktree/scripts/` — the server's own SSOT, so provisioning never fails
 *      for lack of an overlay. Resolved with {@link getOpenThrottleRoot}, which also holds inside the
 *      server image (`Dockerfile.NestJS` copies `skills/`).
 *
 * Mirrors the `d=skills/...; [ -x ] || d=.agents/...` fallback behind the root `worktree:*` scripts,
 * extended with the SSOT rung. The scripts are repo-agnostic: they resolve the repo from their cwd.
 */
import { accessSync, constants, statSync } from 'node:fs';
import { join } from 'node:path';

import { getOpenThrottleRoot } from '@openthrottle/openthrottle-agentic-utils';

import {
  OT_WORKTREE_SCRIPT_RUNG,
  OT_WORKTREE_SCRIPTS_RELATIVE_PATH,
} from './ot-worktree-script.constants.ts';
import type {
  OtWorktreeScriptCandidate,
  OtWorktreeScriptResolution,
  ResolveOtWorktreeScriptParams,
} from './ot-worktree-script.types.ts';

/** True when `path` is a regular file this process can read. */
const isReadableFile = (path: string): boolean => {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

/** @description The ladder's candidates for one action, in the order they are tried. */
export const otWorktreeScriptCandidates = (
  params: ResolveOtWorktreeScriptParams,
): readonly OtWorktreeScriptCandidate[] => {
  const { action, baseCheckoutPath, env } = params;
  const file = `${action}.sh`;
  const inSkillsRoot = (skillsRoot: string): string => {
    return join(skillsRoot, OT_WORKTREE_SCRIPTS_RELATIVE_PATH, file);
  };

  const candidates: OtWorktreeScriptCandidate[] = [
    {
      path: inSkillsRoot(join(baseCheckoutPath, 'skills')),
      rung: OT_WORKTREE_SCRIPT_RUNG.CHECKOUT_SKILLS,
    },
    {
      path: inSkillsRoot(join(baseCheckoutPath, '.agents', 'skills')),
      rung: OT_WORKTREE_SCRIPT_RUNG.AGENTS_OVERLAY,
    },
    {
      path: inSkillsRoot(join(baseCheckoutPath, '.claude', 'skills')),
      rung: OT_WORKTREE_SCRIPT_RUNG.CLAUDE_OVERLAY,
    },
  ];

  const openThrottleRoot = getOpenThrottleRoot(env);
  if (openThrottleRoot !== undefined) {
    candidates.push({
      path: inSkillsRoot(join(openThrottleRoot, 'skills')),
      rung: OT_WORKTREE_SCRIPT_RUNG.OPENTHROTTLE_SSOT,
    });
  }

  return candidates;
};

/**
 * @description Resolves the script for `action` against `baseCheckoutPath`. Never throws: an
 * unresolvable script comes back as `{ ok: false, searched }` so the caller can name the ladder in
 * its own error.
 */
export const resolveOtWorktreeScript = (
  params: ResolveOtWorktreeScriptParams,
): OtWorktreeScriptResolution => {
  const candidates = otWorktreeScriptCandidates(params);
  const hit = candidates.find((candidate) => {
    return isReadableFile(candidate.path);
  });

  if (hit === undefined) {
    return {
      ok: false,
      searched: candidates.map((candidate) => candidate.path),
    };
  }

  return { ok: true, rung: hit.rung, scriptPath: hit.path };
};
