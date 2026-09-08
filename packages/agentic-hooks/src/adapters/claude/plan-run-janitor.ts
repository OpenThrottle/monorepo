/**
 * Claude Code plan-run janitor (Stop hook).
 *
 * Settles FAILED any `plan_runs` row opened by an interactive loop whose session is
 * provably gone. This is the backstop for the exemption the server makes for runs
 * that cannot heartbeat: those rows are excluded from the stale sweep — deliberately,
 * because sweeping one would reset the plan and its IN_PROGRESS tasks to PENDING
 * under live work — which means nothing server-side will ever settle them.
 *
 * The loop's own settle discipline stays primary; only it knows the CORRECT terminal
 * status (COMPLETED when the PR opens, CANCELLED on a deliberate stop). This handles
 * the runs where that discipline never got the chance to fire.
 *
 * `Stop` fires on EVERY turn and is NOT a session-end signal, so this never settles
 * the session it is running in — it drains what earlier, dead sessions left behind.
 *
 * Additive only; fail-open (always exits 0).
 */
import fs from 'node:fs';

import { logHookError, settleAbandonedPlanRuns } from '../../index';
import { normalizeClaudeStopPayload } from './payload';

const main = async (): Promise<void> => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('plan-run-janitor: invalid JSON stdin', err);
      return;
    }

    // Without a session id we cannot exclude the CURRENT session, and excluding it is
    // the whole safety property — so do nothing rather than risk settling live work.
    const normalized = normalizeClaudeStopPayload(raw);
    if (!normalized) {
      return;
    }

    await settleAbandonedPlanRuns({
      currentSessionId: normalized.session_id,
      repoRoot,
    });
  } catch (err) {
    logHookError('plan-run-janitor failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
