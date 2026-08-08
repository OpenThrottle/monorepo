#!/usr/bin/env node
/**
 * Claude Code entrypoint for AUTOMATIC skill-usage completion (Stop hook).
 *
 * Thin adapter: parse Claude's Stop payload → session id → shared completion
 * core. The Skill tool has no clean per-skill "finished" signal for inline
 * skills (a skill loads instructions that interleave with the rest of the turn),
 * so we treat the end of the main-agent turn (`Stop`) as the completion signal:
 * resolve the open skill-starts recorded for this session (by
 * skill-usage-capture.cjs), emit one `success` outcome each with
 * `duration_ms = now − started_at`, then drain them so a later Stop never
 * double-emits. Also sweeps abandoned starts from long-dead sessions.
 *
 * Additive ONLY — never replaces the PreToolUse/UserPromptExpansion capture
 * path. Fail-open: any error is swallowed; always exit 0 so the turn is never
 * blocked. Server-down outcomes fall back to
 *   <repo>/.cache/skill-usage/outcomes.jsonl  (gitignored via .cache)
 *
 * Automatic classifier emits `success` (the turn completed) or `abandoned`
 * (session ended without a Stop). `error` stays reachable via the opt-in manual
 * helper skill-usage-outcome.cjs — the Stop payload carries no reliable error
 * signal.
 *
 * Env: same OT URL/auth resolution as skill-usage-capture.cjs, plus
 *   SKILL_USAGE_ABANDONED_MS — override the abandoned staleness window.
 */
'use strict';

const fs = require('node:fs');

const {
  completeOpenStartsForSession,
  drainBufferedUsage,
  logHookError,
  sweepAbandonedStarts,
} = require('../../.agents/hooks/skill-usage/lib.cjs');
const {
  normalizeClaudeStopPayload,
} = require('./skill-usage-claude-adapter.cjs');

const main = async () => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }

    let raw;
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
    // down. Small budget so the turn is never stalled; unsent lines are retained.
    await drainBufferedUsage({ budgetMs: 500, repoRoot });
  } catch (err) {
    logHookError('complete failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
