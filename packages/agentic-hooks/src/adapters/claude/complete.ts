/**
 * Claude Code AUTOMATIC completion entrypoint (Stop / SubagentStop hook).
 * Resolves the open skill-starts recorded for this session into `success`
 * outcomes with `duration_ms = now − started_at`, drains them (deduped), sweeps
 * abandoned starts from long-dead sessions, then does a small time-boxed JSONL
 * drain. Additive only; fail-open (always exits 0).
 */
import fs from 'node:fs';

import {
  completeOpenStartsForSession,
  drainBufferedUsage,
  logHookError,
  sweepAbandonedStarts,
} from '../../index';
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
      logHookError('complete: invalid JSON stdin', err);
      return;
    }

    const normalized = normalizeClaudeStopPayload(raw);
    if (!normalized) {
      // No session id → nothing to correlate; still try the abandoned sweep.
      await sweepAbandonedStarts({ repoRoot }).catch(() => {});
      return;
    }

    await completeOpenStartsForSession({
      repoRoot,
      sessionId: normalized.session_id,
    });

    // Best-effort: reap starts stranded by earlier sessions that never Stopped.
    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot,
    });

    // Opportunistic, time-boxed: flush any JSONL buffered while the server was
    // down. Small budget so the turn is never stalled; unsent lines retained.
    await drainBufferedUsage({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError('complete failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
