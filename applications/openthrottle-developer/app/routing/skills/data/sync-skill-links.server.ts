/**
 * @description Server-only: runs `skills/ot-skill-sync/scripts/sync.sh` so a
 * newly written skill becomes discoverable. This is the ONLY subprocess in
 * openthrottle-developer, and it is deliberately narrow — it runs one fixed
 * script with no arguments, and there is no general "run a script" helper here
 * to grow into one.
 *
 * Why a subprocess at all: `discoverRepoSkills` scans the agent layout dirs
 * (`.agents/skills`, `.claude/skills`, …) and never `skills/` nor the personal
 * root. Both create destinations are invisible on `/skills` until sync links
 * them into `.agents/skills/`. Writing the file alone would produce a skill that
 * never appears — a feature that looks broken on its own success screen.
 * Re-implementing sync's linking in TS was the alternative, and it would
 * duplicate collision rules and the managed `.gitignore` block across a shell
 * script and a module that then have to stay in step.
 *
 * The safety envelope:
 * - `execFileSync` with an array argv and no shell, so nothing is interpolated.
 *   No user-derived value ever reaches argv — the slug reaches sync only as a
 *   directory already sitting on disk.
 * - The script path is a CONSTANT repo-relative path joined onto the resolved
 *   monorepo root, then realpath-checked to be inside it.
 * - `cwd` is pinned to the monorepo root. Load-bearing: sync's `detect_repo_root`
 *   is `git rev-parse --show-toplevel`, so cwd decides which repo gets synced.
 * - Bounded by a timeout and a max buffer.
 * - Action-only. Never call this from a loader — a subprocess on a GET is a
 *   denial-of-service seam.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { isPathInsideRoot } from '~/routing/agents/data/skill-path-allowlist.server';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';

/** Fixed, repo-relative. Never built from client input. */
const SYNC_SCRIPT_RELATIVE_PATH = 'skills/ot-skill-sync/scripts/sync.sh';

/** Sync links a whole catalog; generous, but never unbounded. */
const SYNC_TIMEOUT_MS = 60_000;

/** Sync's stdout is a short report — a runaway is a bug, not a big report. */
const SYNC_MAX_BUFFER_BYTES = 4 * 1024 * 1024;

export type SyncSkillLinksResult =
  { readonly error: string; readonly ok: false } | { readonly ok: true };

/**
 * @description Runs ot-skill-sync against `monorepoRoot`, linking every
 * committed and personal skill into the layout discovery scans. Refusals (a
 * missing script, one resolving outside the root) and a non-zero exit both
 * return a structured error — callers MUST surface it rather than reporting a
 * successful create, because the file is on disk but not yet discoverable.
 */
export const syncSkillLinks = (monorepoRoot: string): SyncSkillLinksResult => {
  const scriptPath = join(monorepoRoot, SYNC_SCRIPT_RELATIVE_PATH);

  if (!existsSync(scriptPath) || !isPathInsideRoot(monorepoRoot, scriptPath)) {
    return { error: SKILL_CREATE_COPY.syncScriptMissingError, ok: false };
  }

  try {
    execFileSync('bash', [scriptPath], {
      cwd: monorepoRoot,
      // Inherited so OPENTHROTTLE_PERSONAL_SKILLS_DIR reaches sync: it must
      // resolve the same personal root the create module just wrote into, or
      // sync links a different root and the skill never appears.
      env: process.env,
      killSignal: 'SIGKILL',
      maxBuffer: SYNC_MAX_BUFFER_BYTES,
      stdio: 'pipe',
      timeout: SYNC_TIMEOUT_MS,
    });
  } catch {
    return { error: SKILL_CREATE_COPY.syncFailedError, ok: false };
  }

  return { ok: true };
};
