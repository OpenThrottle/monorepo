/**
 * Cursor AUTOMATIC completion entrypoint (`sessionEnd` hook).
 *
 * Keyed off `sessionEnd`, NOT `stop`. Measured against
 * `cursor-agent 2026.09.10-fd3934a`: `stop` is Cursor's per-turn event and
 * does not fire in headless `-p` runs at all, while `sessionEnd` fires once
 * per session and carries the session id, a duration and a final status. See
 * `docs/monorepo/cursor-agent-hook-probe.md`.
 *
 * Thin by construction — it calls the same neutral core functions the Claude
 * completion entrypoint does, and adds only the two things that are genuinely
 * Cursor's: which event to listen to, and how to read its final status.
 * Fail-open (always exits 0).
 */
import fs from 'node:fs';

import {
  completeOpenStartsForSession,
  drainBufferedUsage,
  logHookError,
  sweepAbandonedStarts,
} from '../../index.ts';
import {
  CURSOR_SOURCE,
  cursorOutcomeForFinalStatus,
  normalizeCursorSessionEndPayload,
} from './payload.ts';

const main = async (): Promise<void> => {
  try {
    const repoRoot =
      process.env.CURSOR_PROJECT_DIR ||
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

    const normalized = normalizeCursorSessionEndPayload(raw);
    if (!normalized) {
      // Not a sessionEnd, or no session id to correlate on; still try the
      // abandoned sweep so stranded starts are not left forever.
      await sweepAbandonedStarts({ repoRoot, source: CURSOR_SOURCE }).catch(
        () => {},
      );
      return;
    }

    await completeOpenStartsForSession({
      outcome: cursorOutcomeForFinalStatus(normalized.final_status),
      repoRoot,
      sessionId: normalized.session_id,
      source: CURSOR_SOURCE,
    });

    // Best-effort: reap starts stranded by earlier sessions that never ended.
    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot,
      source: CURSOR_SOURCE,
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
