/**
 * @description Notes the plan run this session opened on disk, so a later Claude Code
 * `Stop` hook can settle it if this session dies before settling it itself.
 *
 * This exists because a run registered here declares `heartbeatExpected: false` and is
 * therefore exempt from the server's 120s stale sweep — deliberately, since sweeping one
 * would reset the plan and its IN_PROGRESS tasks to PENDING under live work.
 *
 * The server does now settle such rows eventually: an unsupervised age sweep at
 * UNSUPERVISED_STALE_CUTOFF_MS (12h), plus settle-on-next-register. This hook remains
 * worth having because it is far faster than either — it fires on evidence that the
 * session is gone rather than on elapsed time, so a crashed Claude session's worktree
 * is freed in hours rather than half a day.
 *
 * The reader is `@openthrottle/agentic-hooks` (`src/data/plan-runs.ts`, bundled to
 * `.claude/hooks/plan-run-janitor.cjs`). The JSON file on disk stays the contract
 * between them, and always will: the janitor is a separate esbuild-bundled process with
 * no `node_modules` to resolve, so the file is cross-process IPC that no import can
 * replace.
 *
 * What the import DOES replace is the duplication that used to sit around it. This
 * module called a hand-copied writer, against a hand-mirrored record interface, keyed by
 * a hand-copied path constant — three things a human had to keep in lockstep. It now
 * calls the same {@link recordPlanRunForSession} the janitor reads for, so the shape
 * cannot drift.
 *
 * Stdio only, and silent whenever it cannot write: the HTTP surface has no caller
 * session and no caller workspace, and a missing backstop costs the backstop, never
 * the run.
 */

import {
  clearPlanRunForSession,
  recordPlanRunForSession,
} from '@openthrottle/agentic-hooks';

import { getCapturedWorkspacePath } from './workspace-path.ts';

/**
 * The session and workspace to key the note on, or null when either is unavailable —
 * which is the normal case off the stdio path.
 */
const resolveBackstopTarget = (): {
  readonly repoRoot: string;
  readonly sessionId: string;
} | null => {
  const repoRoot = getCapturedWorkspacePath();
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID?.trim() ?? '';
  if (repoRoot === null || sessionId === '') return null;

  return { repoRoot, sessionId };
};

/** @description Records the run this session opened. Best-effort; never throws. */
export const rememberPlanRunForBackstop = (
  planId: string,
  planRunId: string,
): void => {
  const target = resolveBackstopTarget();
  if (target === null) return;

  // Fail-open inside: a write failure is logged to stderr and reported by the return
  // value, never thrown. A missing backstop is a degraded backstop, not a failed run.
  recordPlanRunForSession({
    planId,
    planRunId,
    repoRoot: target.repoRoot,
    sessionId: target.sessionId,
  });
};

/**
 * @description Drops the note, so the janitor and the loop can never both settle the
 * same run. Best-effort; never throws.
 */
export const forgetPlanRunForBackstop = (): void => {
  const target = resolveBackstopTarget();
  if (target === null) return;

  clearPlanRunForSession({
    repoRoot: target.repoRoot,
    sessionId: target.sessionId,
  });
};
