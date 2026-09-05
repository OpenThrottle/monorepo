/**
 * @description Notes the plan run this session opened on disk, so a later Claude Code
 * `Stop` hook can settle it if this session dies before settling it itself.
 *
 * This exists because a run registered here declares `heartbeatExpected: false` and is
 * therefore exempt from the server's stale sweep — deliberately, since sweeping one
 * would reset the plan and its IN_PROGRESS tasks to PENDING under live work. The cost
 * of that exemption is that NOTHING server-side will ever settle such a row, so an
 * abandoned one is permanent and holds its worktree marked busy forever.
 *
 * The reader is `@openthrottle/agentic-hooks` (`src/data/plan-runs.ts`, bundled to
 * `.claude/hooks/plan-run-janitor.cjs`). The two are NOT coupled through an import:
 * that package's ESM declarations re-export extensionless relative paths, which do not
 * resolve for a NodeNext consumer, and fixing that is a change to a shipped hook
 * package rather than something to do in passing here. They share a deliberately tiny,
 * stable file contract instead — one JSON object per session, documented on both sides.
 * Keep {@link PlanRunBackstopRecord} in lockstep with `PlanRunRecord` there.
 *
 * Stdio only, and silent whenever it cannot write: the HTTP surface has no caller
 * session and no caller workspace, and a missing backstop costs the backstop, never
 * the run.
 */

import fs from 'fs';
import path from 'path';
import { getCapturedWorkspacePath } from './workspace-path.ts';

/** The on-disk shape, mirroring `PlanRunRecord` in @openthrottle/agentic-hooks. */
interface PlanRunBackstopRecord {
  readonly planId: string;
  readonly planRunId: string;
  readonly recordedAt: string;
  readonly sessionId: string;
}

/** Mirrors `PLAN_RUNS_DIR_REL` in the janitor. Gitignored via `.cache`. */
const PLAN_RUNS_DIR_REL = path.join('.cache', 'plan-runs');

const sanitizeSessionId = (sessionId: string): string =>
  sessionId.replace(/[^A-Za-z0-9._-]/g, '-');

/**
 * The session and workspace to key the note on, or null when either is unavailable —
 * which is the normal case off the stdio path.
 */
const resolveBackstopTarget = (): {
  readonly filePath: string;
  readonly sessionId: string;
} | null => {
  const repoRoot = getCapturedWorkspacePath();
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID?.trim() ?? '';
  if (repoRoot === null || sessionId === '') return null;

  return {
    filePath: path.join(
      repoRoot,
      PLAN_RUNS_DIR_REL,
      `${sanitizeSessionId(sessionId)}.json`,
    ),
    sessionId,
  };
};

/** @description Records the run this session opened. Best-effort; never throws. */
export const rememberPlanRunForBackstop = (
  planId: string,
  planRunId: string,
): void => {
  try {
    const target = resolveBackstopTarget();
    if (target === null) return;

    const record: PlanRunBackstopRecord = {
      planId,
      planRunId,
      recordedAt: new Date().toISOString(),
      sessionId: target.sessionId,
    };
    fs.mkdirSync(path.dirname(target.filePath), { recursive: true });
    fs.writeFileSync(
      target.filePath,
      `${JSON.stringify(record, null, 2)}\n`,
      'utf8',
    );
  } catch {
    // A missing backstop is a degraded backstop, not a failed run.
  }
};

/**
 * @description Drops the note, so the janitor and the loop can never both settle the
 * same run. Best-effort; never throws.
 */
export const forgetPlanRunForBackstop = (): void => {
  try {
    const target = resolveBackstopTarget();
    if (target === null) return;

    fs.rmSync(target.filePath, { force: true });
  } catch {
    // Settling twice is a safe no-op server-side; this is belt and braces.
  }
};
