/**
 * Claude Code AUTOMATIC completion entrypoint (Stop / SubagentStop hook).
 * Resolves the open skill-starts recorded for this session into `session_ended`
 * outcomes, drains them (deduped), sweeps abandoned starts from long-dead
 * sessions, folds the session transcript(s) into per-request token usage rows
 * (see `transcript-usage.ts`), uploads closed OpenThrottle task trajectories
 * (see `session-trajectory.ts`), then does a small time-boxed JSONL drain.
 * Additive only; fail-open (always exits 0).
 *
 * A Claude `Stop` payload carries `session_id`, `transcript_path` and `cwd`
 * (`SubagentStop` adds `agent_id`, `agent_type` and `agent_transcript_path`;
 * see `__tests__/fixtures/`). None of that is an error or per-skill signal, so
 * this path makes no quality claim and reports no duration. See
 * `completeOpenStartsForSession`.
 */
import fs from 'node:fs';

import {
  completeOpenStartsForSession,
  drainBufferedTrajectories,
  drainBufferedUsage,
  logHookError,
  sweepAbandonedStarts,
  sweepTrajectoryUploadState,
} from '../../index.ts';
import { resolveClaudeTokenUsageAccount } from './account.ts';
import { CLAUDE_SOURCE, normalizeClaudeStopPayload } from './payload.ts';
import { captureSessionTrajectories } from './session-trajectory.ts';
import { isShadowedByRepoHooks } from './shadow.ts';
import { captureTranscriptUsage } from './transcript-usage.ts';

const main = async (): Promise<void> => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    // The repository registers this same hook; let that copy do the work.
    if (isShadowedByRepoHooks({ repoRoot })) {
      return;
    }

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
      await sweepAbandonedStarts({ repoRoot, source: CLAUDE_SOURCE }).catch(
        () => {},
      );
      return;
    }

    await completeOpenStartsForSession({
      repoRoot,
      sessionId: normalized.session_id,
      source: CLAUDE_SOURCE,
    });

    // Best-effort: reap starts stranded by earlier sessions that never Stopped.
    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot,
      source: CLAUDE_SOURCE,
    });

    // Per-request token usage from the transcript(s) since the last Stop.
    // Bounded per Stop (see MAX_TRANSCRIPT_BYTES_*); a capped read resumes at
    // the next Stop, and a missing or unreadable transcript is just no rows.
    // Rows are stamped with the login `claude auth status` reports right now.
    await captureTranscriptUsage({
      agentTranscriptPath: normalized.agent_transcript_path,
      repoRoot,
      resolveAccount: () => {
        return resolveClaudeTokenUsageAccount(process.env);
      },
      sessionId: normalized.session_id,
      transcriptPath: normalized.transcript_path,
    });

    // Task trajectories: each closed OpenThrottle task segment of the session
    // transcript is sent once (a session with no task segments sends nothing;
    // `OPENTHROTTLE_SESSION_TRAJECTORIES=0` turns this off). Time-boxed.
    await captureSessionTrajectories({
      repoRoot,
      sessionId: normalized.session_id,
      transcriptPath: normalized.transcript_path,
    });

    // Reap upload-state files of long-dead sessions (once a day; the server's idempotency key makes a
    // later re-upload harmless). Fail-open.
    await sweepTrajectoryUploadState();

    // Opportunistic, time-boxed: flush any JSONL buffered while the server was
    // down. Small budget so the turn is never stalled; unsent lines retained.
    await drainBufferedUsage({ budgetMs: 500, repoRoot });
    await drainBufferedTrajectories({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError('complete failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
