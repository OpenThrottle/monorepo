/**
 * Codex AUTOMATIC completion entrypoint (`SessionEnd` hook). Resolves the open
 * skill-starts recorded for this session into outcomes, sweeps abandoned
 * starts, then does a small time-boxed JSONL drain. Fail-open (exits 0).
 *
 * Calls the same neutral core functions the Claude and Cursor completion
 * entrypoints do; the only Codex-specific parts are which event to listen to
 * and how to read its end reason.
 */
import fs from 'node:fs';

import {
  completeOpenStartsForSession,
  drainBufferedUsage,
  logHookError,
  SKILL_USAGE_OUTCOMES,
  sweepAbandonedStarts,
} from '../../index';
import { CODEX_SOURCE, normalizeCodexSessionEndPayload } from './payload';

const main = async (): Promise<void> => {
  try {
    const repoRoot = process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();

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

    const normalized = normalizeCodexSessionEndPayload(raw);
    if (!normalized) {
      await sweepAbandonedStarts({ repoRoot, source: CODEX_SOURCE }).catch(
        () => {},
      );
      return;
    }

    // Codex's SessionEnd `reason` is not an outcome: the captured value for a
    // normal end is `other`, so it cannot distinguish success from failure the
    // way Cursor's `final_status` does. Record `success` — the same thing the
    // Claude completion path records — rather than inventing a mapping from a
    // field that does not carry the distinction.
    await completeOpenStartsForSession({
      outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
      repoRoot,
      sessionId: normalized.session_id,
      source: CODEX_SOURCE,
    });

    await sweepAbandonedStarts({
      currentSessionId: normalized.session_id,
      repoRoot,
      source: CODEX_SOURCE,
    });

    await drainBufferedUsage({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError('complete failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
